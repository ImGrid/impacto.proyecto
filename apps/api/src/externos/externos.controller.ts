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
import { Roles } from '../auth/decorators';
import { ExternosService } from './externos.service';
import {
  CreateExternoDto,
  UpdateExternoDto,
  ExternoQueryDto,
} from './dto';

@Controller('externos')
@Roles(rol_usuario.ADMIN)
export class ExternosController {
  constructor(private readonly externosService: ExternosService) {}

  @Post()
  create(@Body() dto: CreateExternoDto) {
    return this.externosService.create(dto);
  }

  // Lectura abierta a roles que necesitan elegir destino al registrar
  // una transacción. El generador NO aplica (no elige destino).
  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR)
  findAll(@Query() query: ExternoQueryDto) {
    return this.externosService.findAll(query);
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR, rol_usuario.RECOLECTOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.externosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExternoDto,
  ) {
    return this.externosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.externosService.hardDelete(id);
  }
}
