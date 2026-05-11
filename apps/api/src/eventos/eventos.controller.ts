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
import { EventosService } from './eventos.service';
import { CreateEventoDto, UpdateEventoDto, EventoQueryDto } from './dto';

@Controller('eventos')
@Roles(rol_usuario.ADMIN)
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  create(
    @Body() dto: CreateEventoDto,
    @CurrentUser('userId') userId: number,
  ) {
    return this.eventosService.create(dto, userId);
  }

  @Get()
  findAll(
    @Query() query: EventoQueryDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.eventosService.findAll(query, departamentoActivo);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.eventosService.findOne(id, departamentoActivo);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.eventosService.update(id, dto, departamentoActivo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('departamento_activo') departamentoActivo: number | null,
  ) {
    return this.eventosService.hardDelete(id, departamentoActivo);
  }
}
