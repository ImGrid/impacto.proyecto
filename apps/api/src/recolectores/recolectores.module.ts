import { Module } from '@nestjs/common';
import { RecolectoresService } from './recolectores.service';
import { RecolectoresController } from './recolectores.controller';

@Module({
  controllers: [RecolectoresController],
  providers: [RecolectoresService],
  exports: [RecolectoresService],
})
export class RecolectoresModule {}
