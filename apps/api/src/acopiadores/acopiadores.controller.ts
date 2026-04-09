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
import { AcopiadoresService } from './acopiadores.service';
import { CreateAcopiadorDto, UpdateAcopiadorDto, AcopiadorQueryDto } from './dto';

@Controller('acopiadores')
@Roles(rol_usuario.ADMIN)
export class AcopiadoresController {
  constructor(private readonly acopiadoresService: AcopiadoresService) {}

  @Post()
  create(@Body() dto: CreateAcopiadorDto) {
    return this.acopiadoresService.create(dto);
  }

  @Get()
  findAll(@Query() query: AcopiadorQueryDto) {
    return this.acopiadoresService.findAll(query);
  }

  @Get('mapa')
  findAllForMap() {
    return this.acopiadoresService.findAllForMap();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.acopiadoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcopiadorDto,
  ) {
    return this.acopiadoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.acopiadoresService.hardDelete(id);
  }
}
