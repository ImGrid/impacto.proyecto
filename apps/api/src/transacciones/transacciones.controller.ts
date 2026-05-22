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
import { Throttle } from '@nestjs/throttler';
import { rol_usuario } from '@prisma/client';
import { Roles, CurrentUser } from '../auth/decorators';
import { TransaccionesService } from './transacciones.service';
import {
  CreateTransaccionDto,
  UpdateTransaccionDto,
  EditTransaccionAdminDto,
  TransaccionQueryDto,
} from './dto';

@Controller('transacciones')
@Roles(
  rol_usuario.ADMIN,
  rol_usuario.ACOPIADOR,
  rol_usuario.RECOLECTOR,
  rol_usuario.GENERADOR,
)
export class TransaccionesController {
  constructor(private readonly transaccionesService: TransaccionesService) {}

  // Rate limit estricto en escritura: 20 transacciones/minuto por IP.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.ACOPIADOR,
    rol_usuario.RECOLECTOR,
    rol_usuario.GENERADOR,
  )
  create(
    @Body() dto: CreateTransaccionDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.transaccionesService.create(dto, userId, rol);
  }

  @Get()
  findAll(
    @Query() query: TransaccionQueryDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.transaccionesService.findAll(query, userId, rol, departamentoActivo);
  }

  @Get('pendientes')
  @Roles(rol_usuario.ACOPIADOR)
  findPendientes(
    @CurrentUser('userId') userId: number,
    @Query('recolector_id', new ParseIntPipe({ optional: true }))
    recolectorId?: number,
  ) {
    return this.transaccionesService.findPendientes(userId, recolectorId);
  }

  @Get('disponibles')
  @Roles(rol_usuario.RECOLECTOR)
  findDisponibles(@CurrentUser('userId') userId: number) {
    return this.transaccionesService.findDisponibles(userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.transaccionesService.findOne(id, userId, rol, departamentoActivo);
  }

  @Patch(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransaccionDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.transaccionesService.update(id, dto, userId, rol, departamentoActivo);
  }

  // Edición admin: corrige campos sin avanzar estado.
  @Patch(':id/editar')
  @Roles(rol_usuario.ADMIN)
  editAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditTransaccionAdminDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.transaccionesService.editAdmin(id, dto, departamentoActivo);
  }

  @Delete(':id')
  @Roles(rol_usuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.transaccionesService.remove(id, departamentoActivo);
  }
}
