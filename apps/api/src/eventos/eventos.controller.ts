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
  findAll(@Query() query: EventoQueryDto) {
    return this.eventosService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
  ) {
    return this.eventosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.hardDelete(id);
  }
}
