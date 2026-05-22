import { BadRequestException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma normal o transaccional. Igual que en
 * `mismo-departamento.helper.ts`: aceptar ambos permite correr el chequeo
 * dentro de una transacción cuando hace falta.
 */
type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

/**
 * Verifica que una zona pertenezca a un departamento concreto, siguiendo la
 * cadena zona → ciudad → departamento.
 *
 * Mantiene coherente el campo `departamento_id` denormalizado de los actores
 * (recolector, centro operacional, sucursal) con la zona a la que están
 * asignados — requisito del doc 19 §5.2. Sin esta validación se podía crear,
 * por ejemplo, un recolector con `zona_id` de Cochabamba y `departamento_id`
 * de La Paz, lo que corrompe el filtro multi-departamento.
 *
 * Lanza `BadRequestException` si la zona no existe o si pertenece a un
 * departamento distinto del indicado.
 */
export async function ensureZonaEnDepartamento(
  prisma: AnyPrismaClient,
  zonaId: number,
  departamentoId: number,
) {
  const zona = await prisma.zona.findUnique({
    where: { id: zonaId },
    select: { ciudad: { select: { departamento_id: true } } },
  });

  if (!zona) {
    throw new BadRequestException('La zona indicada no existe');
  }
  if (zona.ciudad.departamento_id !== departamentoId) {
    throw new BadRequestException(
      'La zona seleccionada no pertenece al departamento indicado',
    );
  }
}
