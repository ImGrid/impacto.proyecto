import { Module } from '@nestjs/common';
import { AcopiadoresService } from './acopiadores.service';
import { AcopiadoresController } from './acopiadores.controller';

@Module({
  controllers: [AcopiadoresController],
  providers: [AcopiadoresService],
  exports: [AcopiadoresService],
})
export class AcopiadoresModule {}
