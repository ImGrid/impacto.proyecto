import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env local (packages/database/.env) y luego el raíz para ADMIN_*
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

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tripleimpacto.bo';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn(
      'WARNING: ADMIN_PASSWORD no está definida. No se creará el admin.',
    );
    return;
  }

  const passwordHash = await argon2.hash(adminPassword);

  // 1. Crear/actualizar usuario base (tabla usuario)
  const usuario = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password_hash: passwordHash,
      rol: 'ADMIN',
      activo: true,
    },
  });

  // 2. Crear/actualizar perfil administrador (tabla administrador)
  const admin = await prisma.administrador.upsert({
    where: { usuario_id: usuario.id },
    update: {},
    create: {
      usuario_id: usuario.id,
      nombre_completo: 'Administrador del Sistema',
      telefono: '00000000',
    },
  });

  console.log(`Administrador creado/verificado:`);
  console.log(`  Email: ${usuario.email}`);
  console.log(`  ID usuario: ${usuario.id}`);
  console.log(`  ID admin: ${admin.id}`);
  console.log(`  Rol: ${usuario.rol}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error('Error ejecutando seed:', e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
