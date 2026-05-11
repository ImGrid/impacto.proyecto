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
 * vivir DENTRO de una transacción para evitar TOCTOU (que el departamento
 * del recolector o del centro operacional cambie entre el check y la
 * inserción).
 */
type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

/**
 * Verifica que un recolector y un centro operacional pertenezcan al mismo
 * departamento. Cierra IDOR (OWASP API1:2023 BOLA) reemplazando el viejo
 * vínculo fijo `recolector.acopiador_id` que existía cuando los
 * recolectores estaban asignados a un único acopiador.
 *
 * Si el recolector no existe lanza `BadRequestException`. Si el centro
 * operacional no existe lanza `BadRequestException`. Si ambos existen
 * pero están en departamentos distintos, lanza `ForbiddenException`.
 *
 * Usar siempre con el cliente transaccional cuando esté disponible
 * (`prisma.$transaction(async (tx) => …)`) para que el chequeo y la
 * operación corran en la misma transacción.
 *
 * @returns El recolector encontrado, por si el llamador necesita campos
 *          como `zona_id` o `departamento_id` (evita un SELECT extra).
 */
export async function ensureMismoDepartamento(
  prisma: AnyPrismaClient,
  recolectorId: number,
  centroOperacionalId: number,
) {
  const [recolector, centroOperacional] = await Promise.all([
    prisma.recolector.findUnique({
      where: { id: recolectorId },
    }),
    prisma.centro_operacional.findUnique({
      where: { id: centroOperacionalId },
      select: { id: true, departamento_id: true },
    }),
  ]);

  if (!recolector) {
    throw new BadRequestException('Recolector no encontrado');
  }
  if (!centroOperacional) {
    throw new BadRequestException('Centro operacional no encontrado');
  }
  if (recolector.departamento_id !== centroOperacional.departamento_id) {
    throw new ForbiddenException(
      'El recolector y el centro operacional pertenecen a departamentos distintos',
    );
  }
  return recolector;
}
