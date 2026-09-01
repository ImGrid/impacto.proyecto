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
import { ResetPasswordDto } from '../common/dto';
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

  // Restablecer la contraseña. Ruta aparte del PATCH normal para que cambiar
  // la contraseña sea siempre un acto deliberado.
  @Patch(':id/password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.generadoresService.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.generadoresService.hardDelete(id);
  }
}
