import { Controller, Get, Patch, Body } from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto';

@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  getMyProfile(
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
  ) {
    return this.perfilService.getMyProfile(userId, rol);
  }

  @Patch()
  updateMyProfile(
    @CurrentUser('userId') userId: number,
    @CurrentUser('rol') rol: rol_usuario,
    @Body() dto: UpdatePerfilDto,
  ) {
    return this.perfilService.updateMyProfile(userId, rol, dto);
  }
}
