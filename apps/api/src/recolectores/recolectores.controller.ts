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
import { RecolectoresService } from './recolectores.service';
import {
  CreateRecolectorDto,
  UpdateRecolectorDto,
  RecolectorQueryDto,
} from './dto';

@Controller('recolectores')
@Roles(rol_usuario.ADMIN)
export class RecolectoresController {
  constructor(private readonly recolectoresService: RecolectoresService) {}

  @Post()
  create(
    @Body() dto: CreateRecolectorDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.create(dto, departamentoActivo);
  }

  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findAll(
    @Query() query: RecolectorQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.findAll(query, departamentoActivo);
  }

  @Get('mapa')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findAllForMap(
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.findAllForMap(departamentoActivo);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.findOne(id, departamentoActivo);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecolectorDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.update(id, dto, departamentoActivo);
  }

  // Restablecer la contraseña. Va en una ruta aparte y no en el PATCH normal
  // para que cambiar la contraseña sea siempre un acto deliberado y quede
  // claro en los registros del servidor, en vez de viajar mezclado con una
  // edición cualquiera del perfil.
  @Patch(':id/password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.recolectoresService.resetPassword(
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
    return this.recolectoresService.hardDelete(id, departamentoActivo);
  }
}
