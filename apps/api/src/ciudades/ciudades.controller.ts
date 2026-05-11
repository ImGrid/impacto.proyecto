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
import { CiudadesService } from './ciudades.service';
import {
  CreateCiudadDto,
  UpdateCiudadDto,
  CiudadQueryDto,
} from './dto';

@Controller('ciudades')
@Roles(rol_usuario.ADMIN)
export class CiudadesController {
  constructor(private readonly ciudadesService: CiudadesService) {}

  @Post()
  create(@Body() dto: CreateCiudadDto) {
    return this.ciudadesService.create(dto);
  }

  @Get()
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.ACOPIADOR,
    rol_usuario.RECOLECTOR,
    rol_usuario.GENERADOR,
  )
  findAll(@Query() query: CiudadQueryDto) {
    return this.ciudadesService.findAll(query);
  }

  @Get(':id')
  @Roles(
    rol_usuario.ADMIN,
    rol_usuario.ACOPIADOR,
    rol_usuario.RECOLECTOR,
    rol_usuario.GENERADOR,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ciudadesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCiudadDto,
  ) {
    return this.ciudadesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ciudadesService.hardDelete(id);
  }
}
