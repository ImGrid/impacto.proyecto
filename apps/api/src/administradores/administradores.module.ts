import { Module } from '@nestjs/common';
import { AdministradoresService } from './administradores.service';
import { AdministradoresController } from './administradores.controller';

@Module({
  controllers: [AdministradoresController],
  providers: [AdministradoresService],
  exports: [AdministradoresService],
})
export class AdministradoresModule {}
