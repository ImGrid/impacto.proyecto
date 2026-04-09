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
import { Roles, CurrentUser } from '../auth/decorators';
import { AdministradoresService } from './administradores.service';
import {
  CreateAdministradorDto,
  UpdateAdministradorDto,
  AdministradorQueryDto,
} from './dto';

@Controller('administradores')
@Roles(rol_usuario.ADMIN)
export class AdministradoresController {
  constructor(
    private readonly administradoresService: AdministradoresService,
  ) {}

  @Post()
  create(@Body() dto: CreateAdministradorDto) {
    return this.administradoresService.create(dto);
  }

  @Get()
  findAll(@Query() query: AdministradorQueryDto) {
    return this.administradoresService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.administradoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdministradorDto,
  ) {
    return this.administradoresService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ) {
    return this.administradoresService.hardDelete(id, userId);
  }
}
