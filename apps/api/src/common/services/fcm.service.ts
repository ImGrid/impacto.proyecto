import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const keyPath = path.resolve(__dirname, '../../../firebase-service-account.json');

    if (!fs.existsSync(keyPath)) {
      this.logger.warn(
        'Firebase service account key not found. Push notifications disabled.',
      );
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert(keyPath),
      });
      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.warn(`Firebase init failed: ${error}. Push notifications disabled.`);
    }
  }

  /**
   * Enviar push notification a un usuario específico.
   * Si el usuario no tiene device_token, no hace nada.
   */
  async sendToUser(userId: number, title: string, body: string) {
    if (!this.isInitialized) return;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { device_token: true },
    });

    if (!usuario?.device_token) return;

    await this.sendPush(usuario.device_token, title, body);
  }

  /**
   * Enviar push notification a todos los recolectores de una zona.
   * Solo envía a los que tienen device_token.
   */
  async sendToZone(zonaId: number, title: string, body: string) {
    if (!this.isInitialized) return;

    const recolectores = await this.prisma.recolector.findMany({
      where: { zona_id: zonaId, activo: true },
      select: {
        usuario: { select: { device_token: true } },
      },
    });

    const tokens = recolectores
      .map((r) => r.usuario.device_token)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) return;

    await Promise.allSettled(
      tokens.map((token) => this.sendPush(token, title, body)),
    );
  }

  private async sendPush(token: string, title: string, body: string) {
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
      });
    } catch (error: any) {
      // Token inválido o expirado — lo limpiamos de la BD
      if (
        error?.code === 'messaging/invalid-registration-token' ||
        error?.code === 'messaging/registration-token-not-registered'
      ) {
        await this.prisma.usuario.updateMany({
          where: { device_token: token },
          data: { device_token: null },
        });
        this.logger.warn(`Removed invalid device token`);
      }
    }
  }
}
