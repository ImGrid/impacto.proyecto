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
import { ZonasService } from './zonas.service';
import { CreateZonaDto, UpdateZonaDto, ZonaQueryDto } from './dto';

@Controller('zonas')
@Roles(rol_usuario.ADMIN)
export class ZonasController {
  constructor(private readonly zonasService: ZonasService) {}

  @Post()
  create(@Body() dto: CreateZonaDto) {
    return this.zonasService.create(dto);
  }

  @Get()
  findAll(@Query() query: ZonaQueryDto) {
    return this.zonasService.findAll(query);
  }

  @Get('mapa')
  findAllForMap() {
    return this.zonasService.findAllForMap();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zonasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZonaDto,
  ) {
    return this.zonasService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zonasService.hardDelete(id);
  }
}
