import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshDto,
  DeviceTokenDto,
  SwitchDepartamentoDto,
} from './dto';
import { Public, CurrentUser, Roles } from './decorators';
import { RefreshTokenGuard } from './guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, userAgent);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser()
    user: {
      userId: number;
      refreshToken: string;
      departamento_activo: number | null;
    },
  ) {
    return this.authService.refreshTokens(
      user.userId,
      user.refreshToken,
      user.departamento_activo,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser('userId') userId: number,
    @Body() dto: RefreshDto,
  ) {
    return this.authService.logout(userId, dto.refresh_token);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser('userId') userId: number) {
    return this.authService.logoutAll(userId);
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  updateDeviceToken(
    @CurrentUser('userId') userId: number,
    @Body() dto: DeviceTokenDto,
  ) {
    return this.authService.updateDeviceToken(userId, dto.device_token);
  }

  /**
   * Cambia el departamento activo de la sesión del admin.
   * Invalida todas las sesiones del usuario y emite un par nuevo de tokens
   * con el nuevo `departamento_activo`. Solo aplica a rol ADMIN.
   */
  @Roles(rol_usuario.ADMIN)
  @Post('switch-departamento')
  @HttpCode(HttpStatus.OK)
  switchDepartamento(
    @CurrentUser('userId') userId: number,
    @Body() dto: SwitchDepartamentoDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.switchDepartamento(
      userId,
      dto.departamento_id,
      userAgent,
    );
  }
}
