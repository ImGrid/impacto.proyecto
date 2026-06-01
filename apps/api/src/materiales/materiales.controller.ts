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
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto, UpdateMaterialDto, MaterialQueryDto } from './dto';

@Controller('materiales')
@Roles(rol_usuario.ADMIN)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.materialesService.create(dto, departamentoActivo);
  }

  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR, rol_usuario.GENERADOR)
  findAll(
    @Query() query: MaterialQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.materialesService.findAll(query, departamentoActivo);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR, rol_usuario.GENERADOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.materialesService.findOne(id, departamentoActivo);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.materialesService.update(id, dto, departamentoActivo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.materialesService.hardDelete(id, departamentoActivo);
  }
}
