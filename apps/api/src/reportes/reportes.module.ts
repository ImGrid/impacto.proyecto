import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { PdfService } from './export/pdf.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, PdfService],
})
export class ReportesModule {}
