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
import { PreciosMaterialService } from './precios-material.service';
import {
  CreatePrecioMaterialDto,
  UpdatePrecioMaterialDto,
  PrecioMaterialQueryDto,
} from './dto';

@Controller('precios-material')
@Roles(rol_usuario.ADMIN)
export class PreciosMaterialController {
  constructor(
    private readonly preciosMaterialService: PreciosMaterialService,
  ) {}

  @Post()
  create(@Body() dto: CreatePrecioMaterialDto) {
    return this.preciosMaterialService.create(dto);
  }

  @Get()
  findAll(@Query() query: PrecioMaterialQueryDto) {
    return this.preciosMaterialService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.preciosMaterialService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrecioMaterialDto,
  ) {
    return this.preciosMaterialService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.preciosMaterialService.hardDelete(id);
  }
}
