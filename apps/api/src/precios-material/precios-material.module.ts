import { Module } from '@nestjs/common';
import { PreciosMaterialService } from './precios-material.service';
import { PreciosMaterialController } from './precios-material.controller';

@Module({
  controllers: [PreciosMaterialController],
  providers: [PreciosMaterialService],
  exports: [PreciosMaterialService],
})
export class PreciosMaterialModule {}
