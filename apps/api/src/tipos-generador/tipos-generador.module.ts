import { Module } from '@nestjs/common';
import { TiposGeneradorService } from './tipos-generador.service';
import { TiposGeneradorController } from './tipos-generador.controller';

@Module({
  controllers: [TiposGeneradorController],
  providers: [TiposGeneradorService],
  exports: [TiposGeneradorService],
})
export class TiposGeneradorModule {}
