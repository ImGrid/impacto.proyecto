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
import { AsociacionesService } from './asociaciones.service';
import {
  CreateAsociacionDto,
  UpdateAsociacionDto,
  AsociacionQueryDto,
} from './dto';

@Controller('asociaciones')
@Roles(rol_usuario.ADMIN)
export class AsociacionesController {
  constructor(private readonly asociacionesService: AsociacionesService) {}

  @Post()
  create(@Body() dto: CreateAsociacionDto) {
    return this.asociacionesService.create(dto);
  }

  @Get()
  findAll(@Query() query: AsociacionQueryDto) {
    return this.asociacionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.asociacionesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAsociacionDto,
  ) {
    return this.asociacionesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.asociacionesService.hardDelete(id);
  }
}
