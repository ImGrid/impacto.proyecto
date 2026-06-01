import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/**
 * Guarda imágenes subidas (hoy: foto de perfil del recolector) como ARCHIVOS
 * en disco. La base de datos solo guarda la ruta pública relativa
 * (`/uploads/<subdir>/<uuid>.webp`); el binario nunca entra a la BD.
 *
 * Transporte: el cliente manda la imagen como base64 dentro del JSON (el stack
 * web es 100% JSON). Aquí se decodifica, se valida el formato REAL con libvips
 * (no el Content-Type, falsificable), se reprocesa con sharp (resize + WebP +
 * sin metadatos EXIF) y se escribe a `UPLOAD_DIR`.
 *
 * En producción nginx sirve `/uploads` directamente (la API no es pública); en
 * desarrollo lo sirve la propia API vía `useStaticAssets` (ver main.ts).
 */
@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);

  // Prefijo público bajo el que se sirven los archivos (coincide con el
  // `prefix` de useStaticAssets en main.ts y con el `location /uploads/` de
  // nginx en el VPS).
  private static readonly PUBLIC_PREFIX = '/uploads';

  // Límite del binario decodificado antes de procesar (defensa de memoria).
  private static readonly MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB

  // Lado máximo de la imagen final. Una foto de credencial no necesita más.
  private static readonly MAX_SIDE = 512;

  // Formatos de ENTRADA aceptados (detectados por libvips, no por el cliente).
  private static readonly ALLOWED_INPUT_FORMATS = new Set([
    'jpeg',
    'png',
    'webp',
    'heif', // HEIC de iPhone
    'avif',
  ]);

  constructor(private readonly config: ConfigService) {}

  /** Carpeta raíz de uploads en disco (absoluta). */
  private get uploadDir(): string {
    const dir = this.config.get<string>('UPLOAD_DIR') ?? './uploads';
    return resolve(dir);
  }

  /**
   * Procesa una imagen en base64 y la guarda como WebP en `UPLOAD_DIR/<subdir>`.
   * Devuelve la ruta pública relativa para guardar en BD
   * (ej. `/uploads/recolectores/<uuid>.webp`).
   *
   * Lanza `BadRequestException` si el base64 es inválido, excede el tamaño o
   * no es una imagen de un formato soportado.
   */
  async saveFromBase64(base64: string, subdir: string): Promise<string> {
    const buffer = this.decodeBase64(base64);

    // Validar el formato REAL con libvips antes de reprocesar.
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer, {
        failOn: 'truncated',
        limitInputPixels: 25_000_000, // ~25 MP: corta "decoder bombs"
      }).metadata();
    } catch {
      throw new BadRequestException('La imagen no es válida o está corrupta');
    }

    if (!meta.format || !ImageStorageService.ALLOWED_INPUT_FORMATS.has(meta.format)) {
      throw new BadRequestException(
        'Formato de imagen no soportado. Use JPG, PNG, WebP o HEIC.',
      );
    }

    // Reprocesar: auto-orientar por EXIF, redimensionar (sin recortar ni
    // agrandar), re-codificar a WebP. sharp descarta los metadatos por defecto
    // (quita EXIF/GPS) y el re-encode invalida archivos "polyglot".
    let processed: Buffer;
    try {
      processed = await sharp(buffer, {
        failOn: 'truncated',
        limitInputPixels: 25_000_000,
      })
        .rotate()
        .resize(ImageStorageService.MAX_SIDE, ImageStorageService.MAX_SIDE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen');
    }

    const filename = `${randomUUID()}.webp`;
    const dirAbs = join(this.uploadDir, subdir);
    await fs.mkdir(dirAbs, { recursive: true });
    await fs.writeFile(join(dirAbs, filename), processed);

    return `${ImageStorageService.PUBLIC_PREFIX}/${subdir}/${filename}`;
  }

  /**
   * Borra el archivo correspondiente a una ruta pública
   * (`/uploads/<subdir>/<file>`). No falla si el archivo no existe; solo
   * registra un warning ante otros errores (no debe romper el flujo de negocio).
   */
  async deleteByPublicPath(publicPath: string | null | undefined): Promise<void> {
    if (!publicPath) return;
    const prefix = `${ImageStorageService.PUBLIC_PREFIX}/`;
    if (!publicPath.startsWith(prefix)) return;

    // Quitar el prefijo y prevenir path traversal.
    const relative = publicPath.slice(ImageStorageService.PUBLIC_PREFIX.length + 1);
    const fileAbs = resolve(this.uploadDir, relative);
    if (!fileAbs.startsWith(this.uploadDir)) return;

    try {
      await fs.unlink(fileAbs);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') {
        this.logger.warn(`No se pudo borrar la imagen ${publicPath}: ${e.message}`);
      }
    }
  }

  /** Decodifica un base64 (con o sin prefijo data:) y valida el tamaño. */
  private decodeBase64(base64: string): Buffer {
    // Soporta tanto "data:image/png;base64,AAAA" como el base64 pelado.
    const comma = base64.indexOf(',');
    const payload =
      base64.startsWith('data:') && comma !== -1 ? base64.slice(comma + 1) : base64;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(payload, 'base64');
    } catch {
      throw new BadRequestException('La imagen no es un base64 válido');
    }

    if (buffer.length === 0) {
      throw new BadRequestException('La imagen está vacía');
    }
    if (buffer.length > ImageStorageService.MAX_INPUT_BYTES) {
      throw new BadRequestException('La imagen supera el tamaño máximo (8 MB)');
    }
    return buffer;
  }
}
