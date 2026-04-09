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
import { SucursalesService } from './sucursales.service';
import {
  CreateSucursalDto,
  UpdateSucursalDto,
  SucursalQueryDto,
} from './dto';

@Controller('sucursales')
@Roles(rol_usuario.ADMIN)
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  create(@Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(dto);
  }

  @Get()
  findAll(@Query() query: SucursalQueryDto) {
    return this.sucursalesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.hardDelete(id);
  }
}
