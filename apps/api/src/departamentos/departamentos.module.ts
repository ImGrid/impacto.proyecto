import { Module } from '@nestjs/common';
import { DepartamentosService } from './departamentos.service';
import { DepartamentosController } from './departamentos.controller';

@Module({
  controllers: [DepartamentosController],
  providers: [DepartamentosService],
  exports: [DepartamentosService],
})
export class DepartamentosModule {}
