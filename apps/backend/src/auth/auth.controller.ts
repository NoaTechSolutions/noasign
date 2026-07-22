import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  clearAuthCookies,
  resolveAuthCookieOptions,
  setAuthCookie,
} from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    const cookieOptions = resolveAuthCookieOptions(
      this.configService.get<string>('AUTH_COOKIE_DOMAIN'),
      this.configService.get<string>('JWT_EXPIRES_IN'),
      this.configService.get<string>('NODE_ENV'),
      this.configService.get<string>('AUTH_COOKIE_NAME'),
    );

    setAuthCookie(res, result.accessToken, cookieOptions);

    return {
      message: result.message,
      user: result.user,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = resolveAuthCookieOptions(
      this.configService.get<string>('AUTH_COOKIE_DOMAIN'),
      this.configService.get<string>('JWT_EXPIRES_IN'),
      this.configService.get<string>('NODE_ENV'),
      this.configService.get<string>('AUTH_COOKIE_NAME'),
    );

    // Clear the configured cookie AND the legacy default — a user logging out who
    // still carries a stale cross-environment cookie gets both wiped.
    clearAuthCookies(res, cookieOptions);

    return {
      message: 'Logout success',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, body.password);
  }
}
