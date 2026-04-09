import { Module } from '@nestjs/common';
import { AsociacionesService } from './asociaciones.service';
import { AsociacionesController } from './asociaciones.controller';

@Module({
  controllers: [AsociacionesController],
  providers: [AsociacionesService],
  exports: [AsociacionesService],
})
export class AsociacionesModule {}
