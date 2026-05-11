import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      // Excepciones de NestJS (validación, not found, unauthorized, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      // Errores conocidos de Prisma
      switch (exception.code) {
        case 'P2002':
          // Violación de constraint único.
          //
          // En Prisma con el driver adapter (PostgreSQL nativo) el shape
          // de `meta` cambió: ya no incluye `target`, sino que envuelve el
          // error del driver. Extraemos el nombre del constraint (entre
          // «...» en es-ES o "..." en en-US) del mensaje original.
          status = HttpStatus.CONFLICT;
          message = formatUniqueViolationMessage(exception.meta);
          break;
        case 'P2025':
          // Registro no encontrado
          status = HttpStatus.NOT_FOUND;
          message = 'El registro solicitado no fue encontrado';
          break;
        case 'P2003':
          // Violación de foreign key — depende del contexto
          if (request.method === 'DELETE') {
            status = HttpStatus.CONFLICT;
            message =
              'No se puede eliminar porque tiene registros relacionados. Primero elimine o reasigne los registros dependientes.';
          } else {
            status = HttpStatus.BAD_REQUEST;
            message =
              'El registro referenciado no existe. Verifique que los datos ingresados sean correctos.';
          }
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Error de base de datos';
      }
    } else {
      // Cualquier otra excepción desconocida
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
    }

    // Loguear el error (la razón principal de tener este filtro)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status === HttpStatus.FORBIDDEN) {
      // Eventos de seguridad: log enriquecido con identidad + IP + body
      // sanitizado para detectar enumeración / IDOR / escalación.
      // Recomendación de Sycope (UEBA) y OWASP API Security: monitorear
      // ratio elevado de 403 desde un mismo userId/IP es el indicador
      // principal de ataques BOLA en curso.
      const user = (request as any).user;
      const userInfo = user
        ? `user=${user.identificador} (id=${user.userId}, rol=${user.rol})`
        : 'user=anonymous';
      this.logger.warn(
        `[SECURITY] FORBIDDEN ${request.method} ${request.url} → ${userInfo} ip=${request.ip} body=${JSON.stringify(this.sanitizeBody(request.body))} msg=${JSON.stringify(message)}`,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Quita campos sensibles del body antes de loguearlo. Nunca debemos
   * persistir contraseñas, tokens o secretos en logs (hash o no).
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const SENSIBLES = [
      'password',
      'access_token',
      'refresh_token',
      'token',
      'device_token',
    ];
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    for (const k of SENSIBLES) {
      if (k in clone) clone[k] = '***';
    }
    return clone;
  }
}

/**
 * Convierte el `meta` de un error Prisma P2002 en un mensaje en español
 * comprensible para el usuario final.
 *
 * En Prisma con driver adapter (v5+/PostgreSQL nativo) `meta` tiene la
 * forma `{ modelName, driverAdapterError: { cause: { originalMessage } } }`
 * y NO trae `target` directamente. Extraemos el nombre del constraint del
 * mensaje del driver (entre «...» en es o "..." en en) y de ahí derivamos
 * las columnas. También se cubren formas viejas (`target` como array o
 * string) por compatibilidad.
 *
 * Mapea nombres internos a etiquetas naturales (p. ej. "cedula_identidad"
 * → "cédula de identidad"). Si la columna no está mapeada, se usa el
 * nombre tal cual reemplazando guiones bajos por espacios.
 */
function formatUniqueViolationMessage(meta: unknown): string {
  const FIELD_LABELS: Record<string, string> = {
    nombre: 'nombre',
    codigo: 'código',
    email: 'email',
    identificador: 'identificador',
    cedula_identidad: 'cédula de identidad',
    celular: 'celular',
    telefono: 'teléfono',
    razon_social: 'razón social',
  };

  const normalizeField = (raw: string): string =>
    FIELD_LABELS[raw] ?? raw.replace(/_/g, ' ');

  const modelName = (meta as { modelName?: unknown })?.modelName;
  const extractFieldsFromConstraint = (constraint: string): string[] => {
    // Constraints de Postgres siguen el patrón "{tabla}_{col1}_{col2}_key".
    // Como las tablas pueden contener guion bajo (centro_operacional,
    // recolector_dia_trabajo) no basta con slice(1): usamos `modelName`
    // del meta como prefijo cuando está disponible.
    let trimmed = constraint.replace(/_key$/, '');
    if (typeof modelName === 'string' && trimmed.startsWith(modelName + '_')) {
      trimmed = trimmed.slice(modelName.length + 1);
    } else {
      // Fallback: quitar primer segmento.
      const i = trimmed.indexOf('_');
      if (i >= 0) trimmed = trimmed.slice(i + 1);
    }
    if (!trimmed) return [];
    return trimmed.split('_');
  };

  let fields: string[] = [];

  // Forma vieja: meta.target.
  const target = (meta as { target?: unknown })?.target;
  if (Array.isArray(target)) {
    fields = target.filter((t): t is string => typeof t === 'string');
  } else if (typeof target === 'string') {
    if (target.endsWith('_key')) {
      fields = extractFieldsFromConstraint(target);
    } else {
      fields = [target];
    }
  }

  // Forma actual (Prisma driver adapter): extraer constraint name del
  // originalMessage. Postgres lo emite con el constraint entre «...» (es)
  // o "..." (en/locale por defecto).
  if (fields.length === 0) {
    const originalMessage = (
      meta as {
        driverAdapterError?: {
          cause?: { originalMessage?: string };
        };
      }
    )?.driverAdapterError?.cause?.originalMessage;
    if (typeof originalMessage === 'string') {
      // Soporta tanto «constraint» como "constraint".
      const match =
        originalMessage.match(/«([^»]+)»/) ??
        originalMessage.match(/"([^"]+)"/);
      const constraint = match?.[1];
      if (constraint && constraint.endsWith('_key')) {
        fields = extractFieldsFromConstraint(constraint);
      }
    }
  }

  if (fields.length === 0) {
    return 'Ya existe un registro con esos datos';
  }

  const labels = fields.map(normalizeField);
  if (labels.length === 1) {
    return `Ya existe un registro con ese ${labels[0]}`;
  }
  const last = labels[labels.length - 1];
  const rest = labels.slice(0, -1).join(', ');
  return `Ya existe un registro con esos ${rest} y ${last}`;
}
