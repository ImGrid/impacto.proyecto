import { Module } from '@nestjs/common';
import { GeneradoresService } from './generadores.service';
import { GeneradoresController } from './generadores.controller';

@Module({
  controllers: [GeneradoresController],
  providers: [GeneradoresService],
  exports: [GeneradoresService],
})
export class GeneradoresModule {}
