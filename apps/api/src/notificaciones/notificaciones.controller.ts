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
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto, NotificacionQueryDto } from './dto';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Post()
  @Roles(rol_usuario.ADMIN, rol_usuario.GENERADOR, rol_usuario.RECOLECTOR)
  create(
    @Body() dto: CreateNotificacionDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.notificacionesService.create(dto, userId, rol);
  }

  @Get()
  @Roles(rol_usuario.ADMIN)
  findAll(@Query() query: NotificacionQueryDto) {
    return this.notificacionesService.findAll(query);
  }

  @Get('mias')
  @Roles(rol_usuario.RECOLECTOR, rol_usuario.ACOPIADOR, rol_usuario.GENERADOR)
  findMine(
    @Query() query: NotificacionQueryDto,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.notificacionesService.findMine(query, userId, rol);
  }

  @Get(':id')
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.RECOLECTOR,
    rol_usuario.ACOPIADOR,
    rol_usuario.GENERADOR,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.findOne(id);
  }

  @Patch(':id/leer')
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.RECOLECTOR,
    rol_usuario.ACOPIADOR,
    rol_usuario.GENERADOR,
  )
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.notificacionesService.markAsRead(id, userId, rol);
  }

  @Delete(':id')
  @Roles(rol_usuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.hardDelete(id);
  }
}
