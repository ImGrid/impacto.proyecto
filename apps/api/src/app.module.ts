import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import * as Joi from "joi";
import { PrismaModule } from "./prisma";
import { AuthModule, JwtAuthGuard, RolesGuard } from "./auth";
import { AllExceptionsFilter } from "./common/filters";
import { ZonasModule } from "./zonas";
import { AcopiadoresModule } from "./acopiadores";
import { GeneradoresModule } from "./generadores";
import { RecolectoresModule } from "./recolectores";
import { AsociacionesModule } from "./asociaciones";
import { SucursalesModule } from "./sucursales";
import { MaterialesModule } from "./materiales";
import { TiposGeneradorModule } from "./tipos-generador";
import { PreciosMaterialModule } from "./precios-material";
import { EventosModule } from "./eventos";
import { NotificacionesModule } from "./notificaciones";
import { AdministradoresModule } from "./administradores";

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
      }),
    }),

    // Base de datos (Prisma) - global
    PrismaModule,

    // Autenticación (JWT + Passport)
    AuthModule,

    // Módulos CRUD - Catálogos
    ZonasModule,
    AsociacionesModule,
    MaterialesModule,
    TiposGeneradorModule,
    PreciosMaterialModule,

    // Módulos - Comunicación
    EventosModule,
    NotificacionesModule,

    // Módulos CRUD - Usuarios
    AdministradoresModule,
    AcopiadoresModule,
    GeneradoresModule,
    SucursalesModule,
    RecolectoresModule,

    // Rate limiting: 100 requests por minuto por IP
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
