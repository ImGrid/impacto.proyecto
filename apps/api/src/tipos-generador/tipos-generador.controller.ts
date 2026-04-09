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
import { TiposGeneradorService } from './tipos-generador.service';
import {
  CreateTipoGeneradorDto,
  UpdateTipoGeneradorDto,
  TipoGeneradorQueryDto,
} from './dto';

@Controller('tipos-generador')
@Roles(rol_usuario.ADMIN)
export class TiposGeneradorController {
  constructor(
    private readonly tiposGeneradorService: TiposGeneradorService,
  ) {}

  @Post()
  create(@Body() dto: CreateTipoGeneradorDto) {
    return this.tiposGeneradorService.create(dto);
  }

  @Get()
  findAll(@Query() query: TipoGeneradorQueryDto) {
    return this.tiposGeneradorService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposGeneradorService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoGeneradorDto,
  ) {
    return this.tiposGeneradorService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tiposGeneradorService.hardDelete(id);
  }
}
