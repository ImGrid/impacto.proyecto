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
import { ResetPasswordDto } from '../common/dto';
import { CentrosOperacionalesService } from './centros-operacionales.service';
import {
  CreateCentroOperacionalDto,
  UpdateCentroOperacionalDto,
  CentroOperacionalQueryDto,
} from './dto';

@Controller('centros-operacionales')
@Roles(rol_usuario.ADMIN)
export class CentrosOperacionalesController {
  constructor(
    private readonly centrosOperacionalesService: CentrosOperacionalesService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCentroOperacionalDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.create(dto, departamentoActivo);
  }

  // El RECOLECTOR necesita listar los centros operacionales de su
  // departamento para elegirlos como destino al registrar una recolección
  // (cambio definitivo). El filtro por departamento ya se aplica con el
  // `departamento_activo` que el JWT del recolector lleva.
  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.RECOLECTOR)
  findAll(
    @Query() query: CentroOperacionalQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.findAll(query, departamentoActivo);
  }

  @Get('mapa')
  findAllForMap(
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.findAllForMap(departamentoActivo);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.findOne(id, departamentoActivo);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCentroOperacionalDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.update(id, dto, departamentoActivo);
  }

  // Restablecer la contraseña. Ruta aparte del PATCH normal para que cambiar
  // la contraseña sea siempre un acto deliberado.
  @Patch(':id/password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.resetPassword(
      id,
      dto.password,
      departamentoActivo,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.centrosOperacionalesService.hardDelete(id, departamentoActivo);
  }
}
