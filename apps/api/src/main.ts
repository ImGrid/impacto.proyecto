import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Prefijo global para todas las rutas: /api/...
  app.setGlobalPrefix('api');

  // Servir las imágenes subidas en /uploads (fuera del prefijo /api). En
  // desarrollo las sirve la propia API; en producción nginx intercepta
  // /uploads antes de llegar aquí (más rápido y la API no es pública).
  const uploadDir = resolve(
    configService.get<string>('UPLOAD_DIR') ?? './uploads',
  );
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  // ValidationPipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (solo en desarrollo)
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Triple Impacto API')
      .setDescription('API REST para el Sistema de Gestión de Residuos Reciclables')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`API corriendo en http://localhost:${port}/api`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
