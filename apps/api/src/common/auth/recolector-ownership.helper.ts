import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma utilizable para el chequeo: o el cliente normal
 * (`PrismaService`) o un cliente transaccional (`Prisma.TransactionClient`)
 * recibido en `prisma.$transaction(async (tx) => …)`.
 *
 * Permitir ambos es importante porque la verificación tiene que poder
 * vivir DENTRO de una transacción para evitar TOCTOU (que el dueño del
 * recolector cambie entre el check y la inserción).
 */
type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

/**
 * Verifica que un recolector exista y esté asignado al acopiador
 * indicado. Si no existe lanza `BadRequestException`. Si existe pero
 * pertenece a otro acopiador lanza `ForbiddenException`.
 *
 * Patrón de seguridad: BOLA / IDOR (OWASP API1:2023). El bug que motivó
 * este helper es POST `/transacciones` aceptando un `recolector_id`
 * ajeno con solo verificar existencia, no pertenencia.
 *
 * Usar siempre con el cliente transaccional cuando esté disponible
 * (`prisma.$transaction(async (tx) => …)`) para que el chequeo y la
 * operación corran en la misma transacción.
 *
 * @returns El recolector encontrado, por si el llamador necesita
 *          campos como `zona_id` (evita un SELECT extra).
 */
export async function ensureRecolectorPerteneceAlAcopiador(
  prisma: AnyPrismaClient,
  recolectorId: number,
  acopiadorId: number,
) {
  const recolector = await prisma.recolector.findUnique({
    where: { id: recolectorId },
  });
  if (!recolector) {
    throw new BadRequestException('Recolector no encontrado');
  }
  if (recolector.acopiador_id !== acopiadorId) {
    throw new ForbiddenException(
      'Este recolector no está asignado a usted',
    );
  }
  return recolector;
}
