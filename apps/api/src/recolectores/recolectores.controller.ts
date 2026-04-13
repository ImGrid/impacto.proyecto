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
import { RecolectoresService } from './recolectores.service';
import {
  CreateRecolectorDto,
  UpdateRecolectorDto,
  RecolectorQueryDto,
} from './dto';

@Controller('recolectores')
@Roles(rol_usuario.ADMIN)
export class RecolectoresController {
  constructor(private readonly recolectoresService: RecolectoresService) {}

  @Post()
  create(@Body() dto: CreateRecolectorDto) {
    return this.recolectoresService.create(dto);
  }

  @Get()
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findAll(@Query() query: RecolectorQueryDto) {
    return this.recolectoresService.findAll(query);
  }

  @Get('mapa')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findAllForMap() {
    return this.recolectoresService.findAllForMap();
  }

  @Get(':id')
  @Roles(rol_usuario.ADMIN, rol_usuario.ACOPIADOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recolectoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecolectorDto,
  ) {
    return this.recolectoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recolectoresService.hardDelete(id);
  }
}
