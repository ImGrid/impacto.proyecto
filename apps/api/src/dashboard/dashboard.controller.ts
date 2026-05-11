import { Controller, Get, Query } from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import { DashboardService } from './dashboard.service';
import { EstadisticasQueryDto } from './dto';

@Controller()
@Roles(rol_usuario.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  getDashboard(
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.dashboardService.getDashboard(departamentoActivo);
  }

  @Get('estadisticas')
  getEstadisticas(
    @Query() query: EstadisticasQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.dashboardService.getEstadisticas(query, departamentoActivo);
  }
}
