import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer-core';

/**
 * Generación de PDF con Chrome headless (puppeteer-core). Ver docs/29.
 *
 * Decisiones (investigadas, no adivinadas):
 * - puppeteer-core NO descarga Chromium: usa el Chrome del sistema vía
 *   PUPPETEER_EXECUTABLE_PATH (local: Chrome del sistema; VPS: chromium-browser).
 * - UNA sola instancia de navegador reutilizada (antipatrón: lanzar uno por PDF).
 *   ~2 GB de RAM por instancia; se mantiene caliente entre requests.
 * - Una `page` por PDF, cerrada SIEMPRE en `finally` (evita fuga de memoria).
 * - `printBackground: true` para que salgan los colores de marca (el CSS además
 *   usa `print-color-adjust: exact`).
 * - Esperar `document.fonts.ready` antes de `page.pdf()` para que no caiga al
 *   tipo de letra de fallback.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  // Generación de PDF de reportes con Chrome headless (docs/29).
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  // Concurrencia: cada PDF abre una `page` (RAM no trivial) y el VPS comparte
  // memoria con otros servicios, así que se limita cuántas se generan a la vez.
  // Las que excedan el tope esperan en una cola FIFO (mismo patrón que
  // Gotenberg: tope de concurrencia + cola), con timeout para no acumular
  // peticiones colgadas.
  private readonly maxConcurrent = 2;
  private readonly queueTimeoutMs = 30000;
  private active = 0;
  private readonly queue: Array<() => void> = [];

  // Reciclaje: un Chrome de larga vida acumula fugas; tras N PDFs se cierra y
  // relanza (defensa estándar; Gotenberg recicla cada 100). Solo en reposo
  // (sin pages activas) para no matar PDFs en curso.
  private readonly recycleAfter = 80;
  private renderCount = 0;

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (this.launching) return this.launching;

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      throw new Error(
        'PUPPETEER_EXECUTABLE_PATH no está configurado: no se puede generar el PDF. ' +
          'Defina la ruta al ejecutable de Chrome/Chromium.',
      );
    }

    this.launching = puppeteer
      .launch({
        executablePath,
        headless: true,
        // --no-sandbox: imprescindible al correr como servicio en el VPS Linux.
        // --disable-dev-shm-usage: evita crash por /dev/shm pequeño en el VPS.
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      })
      .then((b) => {
        this.browser = b;
        this.launching = null;
        // Si ESTE navegador muere, soltamos la referencia para relanzarlo. Se
        // compara la instancia para no pisar un browser ya relanzado (ni avisar
        // de "desconexión" cuando el cierre fue un reciclaje intencional).
        b.on('disconnected', () => {
          if (this.browser === b) {
            this.browser = null;
            this.logger.warn('El navegador de PDF se desconectó; se relanzará.');
          }
        });
        this.logger.log('Navegador de PDF iniciado.');
        return b;
      })
      .catch((e) => {
        this.launching = null;
        throw e;
      });

    return this.launching;
  }

  /** Renderiza un HTML autocontenido a PDF (Buffer). */
  async render(
    html: string,
    opts: { landscape?: boolean } = {},
  ): Promise<Buffer> {
    await this.acquire();
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      try {
        // HTML autocontenido (CSS y logo en base64, sin red) → 'load' basta.
        // Luego esperamos a que el tipo de letra esté listo antes de imprimir.
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluateHandle('document.fonts.ready');

        const pdf = await page.pdf({
          format: 'A4',
          landscape: opts.landscape ?? false,
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>', // sin cabecera nativa (va en el body)
          footerTemplate: PIE_PDF,
          // Márgenes amplios arriba/abajo para que quepa el pie nativo.
          margin: { top: '12mm', right: '11mm', bottom: '15mm', left: '11mm' },
          timeout: 30000,
        });
        return Buffer.from(pdf);
      } finally {
        await page.close().catch(() => undefined);
      }
    } finally {
      this.renderCount++;
      this.release();
      await this.maybeRecycle();
    }
  }

  /**
   * Reserva un cupo de concurrencia. Si ya hay `maxConcurrent` PDFs en curso,
   * espera en una cola FIFO hasta que se libere uno (o falla tras
   * `queueTimeoutMs`, para no acumular peticiones colgadas).
   */
  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const grant = () => {
        clearTimeout(timer);
        this.active++;
        resolve();
      };
      timer = setTimeout(() => {
        const i = this.queue.indexOf(grant);
        if (i >= 0) this.queue.splice(i, 1);
        reject(
          new Error(
            'El servidor está generando otros reportes; intente de nuevo en unos segundos.',
          ),
        );
      }, this.queueTimeoutMs);
      this.queue.push(grant);
    });
  }

  /** Libera el cupo y, si hay alguien esperando, le cede el turno. */
  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }

  /**
   * Recicla el navegador tras `recycleAfter` PDFs, solo en reposo (sin pages
   * activas, para no matar PDFs en curso). Deja `browser = null` para que el
   * próximo render lo relance con el patrón "one future" de `getBrowser`.
   */
  private async maybeRecycle(): Promise<void> {
    if (this.renderCount < this.recycleAfter || this.active > 0 || !this.browser)
      return;
    this.renderCount = 0;
    const old = this.browser;
    this.browser = null;
    this.logger.log('Reciclando el navegador de PDF (anti-fuga de memoria).');
    await old.close().catch(() => undefined);
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }
}

/**
 * Pie de página nativo de Chrome (se repite en cada hoja). Reglas verificadas:
 * el `font-size` por defecto es 0 → hay que fijarlo; sin CSS externo, todo inline;
 * clases especiales `pageNumber`/`totalPages` las rellena Chrome.
 */
const PIE_PDF = `
<div style="width:100%; font-size:8px; color:#888888; font-family:'Segoe UI',Arial,sans-serif; padding:0 11mm; display:flex; justify-content:space-between; align-items:center;">
  <span>Triple Impacto · Sistema de gestión de reciclaje</span>
  <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
</div>`;
