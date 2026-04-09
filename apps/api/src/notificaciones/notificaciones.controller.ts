import {
  Controller,
  Get,
  Post,
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
@Roles(rol_usuario.ADMIN)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateNotificacionDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.notificacionesService.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: NotificacionQueryDto) {
    return this.notificacionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.hardDelete(id);
  }
}
