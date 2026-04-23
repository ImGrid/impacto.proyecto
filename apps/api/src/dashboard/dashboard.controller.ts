import { Controller, Get, Query } from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { DashboardService } from './dashboard.service';
import { EstadisticasQueryDto } from './dto';

@Controller()
@Roles(rol_usuario.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('estadisticas')
  getEstadisticas(@Query() query: EstadisticasQueryDto) {
    return this.dashboardService.getEstadisticas(query);
  }
}
