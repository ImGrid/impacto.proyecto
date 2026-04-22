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
          // Violación de constraint único
          status = HttpStatus.CONFLICT;
          const fields = (exception.meta?.target as string[])?.join(', ');
          message = `Ya existe un registro con ese valor en: ${fields}`;
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
