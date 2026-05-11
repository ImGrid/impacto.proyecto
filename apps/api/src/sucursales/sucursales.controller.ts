import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { Roles, CurrentUser } from '../auth/decorators';
import { SucursalesService } from './sucursales.service';
import {
  CreateSucursalDto,
  UpdateSucursalDto,
  SucursalQueryDto,
  UpdateHorariosDto,
} from './dto';

@Controller('sucursales')
@Roles(rol_usuario.ADMIN)
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  create(
    @Body() dto: CreateSucursalDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.sucursalesService.create(dto, departamentoActivo);
  }

  @Get()
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.GENERADOR,
    rol_usuario.RECOLECTOR,
    rol_usuario.ACOPIADOR,
  )
  findAll(
    @Query() query: SucursalQueryDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') userRol: rol_usuario,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.sucursalesService.findAll(query, userId, userRol, departamentoActivo);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.GENERADOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
    @CurrentUser('rol') userRol: rol_usuario,
  ) {
    return this.sucursalesService.findOne(id, departamentoActivo, userRol);
  }

  @Patch(':id/horarios')
  @Roles(rol_usuario.GENERADOR, rol_usuario.ADMIN)
  updateHorarios(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHorariosDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.sucursalesService.updateHorarios(id, dto.horarios, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSucursalDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.sucursalesService.update(id, dto, departamentoActivo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.sucursalesService.hardDelete(id, departamentoActivo);
  }
}
