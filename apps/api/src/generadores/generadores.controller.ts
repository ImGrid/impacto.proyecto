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
import { GeneradoresService } from './generadores.service';
import { CreateGeneradorDto, UpdateGeneradorDto, GeneradorQueryDto } from './dto';

@Controller('generadores')
@Roles(rol_usuario.ADMIN)
export class GeneradoresController {
  constructor(private readonly generadoresService: GeneradoresService) {}

  @Post()
  create(@Body() dto: CreateGeneradorDto) {
    return this.generadoresService.create(dto);
  }

  @Get()
  findAll(@Query() query: GeneradorQueryDto) {
    return this.generadoresService.findAll(query);
  }

  @Get('mapa')
  findAllForMap() {
    return this.generadoresService.findAllForMap();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.generadoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGeneradorDto,
  ) {
    return this.generadoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.generadoresService.hardDelete(id);
  }
}
