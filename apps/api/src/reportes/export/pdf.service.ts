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
        // Si el navegador muere, soltamos la referencia para relanzarlo.
        b.on('disconnected', () => {
          this.browser = null;
          this.logger.warn('El navegador de PDF se desconectó; se relanzará.');
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
      await page.close();
    }
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
