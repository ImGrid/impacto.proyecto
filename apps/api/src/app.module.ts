import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import * as Joi from "joi";
import { PrismaModule } from "./prisma";
import { AuthModule, JwtAuthGuard, RolesGuard } from "./auth";
import { AllExceptionsFilter } from "./common/filters";
import { FcmModule } from "./common/services/fcm.module";
import { ImageStorageModule } from "./common/services/image-storage.module";
import { DepartamentosModule } from "./departamentos";
import { CiudadesModule } from "./ciudades";
import { ExternosModule } from "./externos";
import { ZonasModule } from "./zonas";
import { CentrosOperacionalesModule } from "./centros-operacionales";
import { GeneradoresModule } from "./generadores";
import { RecolectoresModule } from "./recolectores";
import { AsociacionesModule } from "./asociaciones";
import { SucursalesModule } from "./sucursales";
import { MaterialesModule } from "./materiales";
import { TiposGeneradorModule } from "./tipos-generador";
import { PreciosMaterialModule } from "./precios-material";
import { EventosModule } from "./eventos";
import { NotificacionesModule } from "./notificaciones";
import { TransaccionesModule } from "./transacciones";
import { PagosModule } from "./pagos";
import { PerfilModule } from "./perfil";
import { DashboardModule } from "./dashboard";

@Module({
  imports: [
    // Configuración de variables de entorno con validación
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRATION: Joi.string().default("15m"),
        JWT_REFRESH_EXPIRATION: Joi.string().default("7d"),
        PORT: Joi.number().default(3001),
        NODE_ENV: Joi.string()
          .valid("development", "production")
          .default("development"),
        CORS_ORIGIN: Joi.string().default("http://localhost:3000"),
        // Carpeta en disco donde se guardan las imágenes subidas (foto de
        // perfil del recolector). En producción debe apuntar FUERA del repo
        // (ej. /var/www/triple-impacto-uploads) y nginx la sirve en /uploads.
        UPLOAD_DIR: Joi.string().default("./uploads"),
      }),
    }),

    // Base de datos (Prisma) - global
    PrismaModule,

    // Firebase Cloud Messaging - global
    FcmModule,

    // Almacenamiento de imágenes (foto de perfil del recolector) - global
    ImageStorageModule,

    // Autenticación (JWT + Passport)
    AuthModule,

    // Módulos CRUD - Catálogos
    DepartamentosModule,
    CiudadesModule,
    ZonasModule,
    AsociacionesModule,
    MaterialesModule,
    TiposGeneradorModule,
    PreciosMaterialModule,
    ExternosModule,

    // Módulos - Comunicación
    EventosModule,
    NotificacionesModule,

    // Módulos CRUD - Usuarios
    // (Administradores se gestionan fuera de la app — vía script de BD —
    // por eso no hay módulo CRUD de administradores.)
    CentrosOperacionalesModule,
    GeneradoresModule,
    SucursalesModule,
    RecolectoresModule,

    // Módulos - Operaciones
    TransaccionesModule,
    PagosModule,

    // Módulo - Perfil propio
    PerfilModule,

    // Módulo - Dashboard (KPIs, gráficos y alertas del panel admin)
    DashboardModule,

    // Rate limiting global: 500 requests por minuto por IP.
    // Los endpoints sensibles (login, refresh, switch-departamento,
    // transacciones, pagos) sobreescriben este límite con @Throttle.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 500,
      },
    ]),
  ],
  controllers: [],
  providers: [
    // Filtro global de excepciones (logging + errores Prisma)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // Guards globales — ORDEN IMPORTA:
    // 1. ThrottlerGuard: rate limiting (antes de todo)
    // 2. JwtAuthGuard: autenticación (verifica token, respeta @Public)
    // 3. RolesGuard: autorización (verifica rol, respeta @Roles)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
