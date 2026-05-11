import { Module } from '@nestjs/common';
import { CentrosOperacionalesService } from './centros-operacionales.service';
import { CentrosOperacionalesController } from './centros-operacionales.controller';

@Module({
  controllers: [CentrosOperacionalesController],
  providers: [CentrosOperacionalesService],
  exports: [CentrosOperacionalesService],
})
export class CentrosOperacionalesModule {}
