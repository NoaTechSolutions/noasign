import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getRequiredEnv } from '../config/get-required-env';
import type { StringValue } from 'ms';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: getRequiredEnv(
          configService.get<string>('JWT_SECRET'),
          'JWT_SECRET',
        ),
        signOptions: {
          expiresIn: normalizeJwtExpiresIn(
            configService.get<string>('JWT_EXPIRES_IN'),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

function normalizeJwtExpiresIn(value?: string): number | StringValue {
  const normalized = value?.trim();

  if (!normalized) {
    return 86400;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized as StringValue;
}
