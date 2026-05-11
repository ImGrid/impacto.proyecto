import { Module } from '@nestjs/common';
import { ExternosService } from './externos.service';
import { ExternosController } from './externos.controller';

@Module({
  controllers: [ExternosController],
  providers: [ExternosService],
  exports: [ExternosService],
})
export class ExternosModule {}
