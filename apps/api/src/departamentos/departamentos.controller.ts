import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { Public, Roles } from '../auth/decorators';
import { DepartamentosService } from './departamentos.service';
import { DepartamentoQueryDto } from './dto';

@Controller('departamentos')
@Roles(rol_usuario.ADMIN)
export class DepartamentosController {
  constructor(private readonly departamentosService: DepartamentosService) {}

  // Endpoint público: la pantalla pre-login del admin web necesita
  // listar los departamentos disponibles antes de autenticarse.
  @Public()
  @Get()
  findAll(@Query() query: DepartamentoQueryDto) {
    return this.departamentosService.findAll(query);
  }

  @Get(':id')
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.ACOPIADOR,
    rol_usuario.RECOLECTOR,
    rol_usuario.GENERADOR,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departamentosService.findOne(id);
  }
}
