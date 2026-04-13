import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { Roles, CurrentUser } from '../auth/decorators';
import { PagosService } from './pagos.service';
import { CreatePagoDto, PagoQueryDto } from './dto';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @Roles(rol_usuario.ACOPIADOR)
  create(
    @Body() dto: CreatePagoDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.pagosService.create(dto, userId);
  }

  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR)
  findAll(
    @Query() query: PagoQueryDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.pagosService.findAll(query, userId, rol);
  }

  @Get('pendientes/:recolectorId')
  @Roles(rol_usuario.ACOPIADOR)
  findPendientes(
    @Param('recolectorId', ParseIntPipe) recolectorId: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.pagosService.findPendientes(recolectorId, userId);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.pagosService.findOne(id, userId, rol);
  }
}
