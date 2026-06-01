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
import { CurrentUser, Roles } from '../auth/decorators';
import { PreciosMaterialService } from './precios-material.service';
import {
  CreatePrecioMaterialDto,
  UpdatePrecioMaterialDto,
  PrecioMaterialQueryDto,
} from './dto';

@Controller('precios-material')
@Roles(rol_usuario.ADMIN)
export class PreciosMaterialController {
  constructor(
    private readonly preciosMaterialService: PreciosMaterialService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePrecioMaterialDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.preciosMaterialService.create(dto, departamentoActivo);
  }

  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR, rol_usuario.GENERADOR)
  findAll(
    @Query() query: PrecioMaterialQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.preciosMaterialService.findAll(query, departamentoActivo);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR, rol_usuario.GENERADOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.preciosMaterialService.findOne(id, departamentoActivo);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrecioMaterialDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.preciosMaterialService.update(id, dto, departamentoActivo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.preciosMaterialService.hardDelete(id, departamentoActivo);
  }
}
