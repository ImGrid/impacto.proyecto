/**
 * Crea los administradores asignados a un departamento.
 *
 * Un administrador "asignado" tiene `administrador.departamento_id` seteado:
 * solo puede operar en ese departamento y no puede cambiarse a otro. Un
 * administrador "global" (departamento_id = null, como `admin@tripleimpacto.bo`)
 * elige el departamento al entrar y puede cambiarlo.
 *
 * Los administradores se provisionan por fuera de la app (no hay CRUD web).
 * Ejecutar con:  pnpm --filter database exec tsx prisma/crear-admins-departamentales.ts
 *
 * Es idempotente: se puede correr de nuevo sin duplicar.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL no está definida');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// departamento_id: 1 = La Paz, 2 = Cochabamba, 3 = Santa Cruz.
const ADMINS = [
  {
    email: 'lapaz@tripleimpacto.bo',
    password: 'AdminLP2026!',
    nombre_completo: 'Administrador La Paz',
    telefono: '00000000',
    departamento_id: 1,
  },
  {
    email: 'cochabamba@tripleimpacto.bo',
    password: 'AdminCB2026!',
    nombre_completo: 'Administrador Cochabamba',
    telefono: '00000000',
    departamento_id: 2,
  },
  {
    email: 'santacruz@tripleimpacto.bo',
    password: 'AdminSC2026!',
    nombre_completo: 'Administrador Santa Cruz',
    telefono: '00000000',
    departamento_id: 3,
  },
];

async function main() {
  // Validar que los departamentos existan antes de crear nada.
  for (const a of ADMINS) {
    const depto = await prisma.departamento.findUnique({
      where: { id: a.departamento_id },
    });
    if (!depto) {
      console.error(
        `ERROR: el departamento_id ${a.departamento_id} no existe.`,
      );
      process.exit(1);
    }
  }

  for (const a of ADMINS) {
    const passwordHash = await argon2.hash(a.password);

    // 1. Usuario base (idempotente por email). En el create se setea la
    //    contraseña; en re-ejecuciones no se sobreescribe.
    const usuario = await prisma.usuario.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email,
        identificador: a.email,
        password_hash: passwordHash,
        rol: 'ADMIN',
        activo: true,
      },
    });

    // 2. Perfil administrador, asignado a su departamento. El update
    //    reasegura la asignación si el script se corre otra vez.
    await prisma.administrador.upsert({
      where: { usuario_id: usuario.id },
      update: {
        nombre_completo: a.nombre_completo,
        telefono: a.telefono,
        departamento_id: a.departamento_id,
      },
      create: {
        usuario_id: usuario.id,
        nombre_completo: a.nombre_completo,
        telefono: a.telefono,
        departamento_id: a.departamento_id,
      },
    });

    console.log(`OK  ${a.nombre_completo}`);
    console.log(`      usuario:     ${a.email}`);
    console.log(`      contraseña:  ${a.password}`);
    console.log(`      departamento_id: ${a.departamento_id}`);
  }

  console.log(
    '\nListo. Estos administradores están asignados a su departamento y no',
  );
  console.log('pueden cambiarse a otro. El admin global se mantiene aparte.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error('Error ejecutando el script:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
