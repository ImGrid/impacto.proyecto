import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto';
import { Public } from './decorators';
import { CurrentUser } from './decorators';
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
  refresh(@CurrentUser() user: { userId: number; refreshToken: string }) {
    return this.authService.refreshTokens(user.userId, user.refreshToken);
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
}
