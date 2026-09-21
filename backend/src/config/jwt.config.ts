import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

export function jwtConfigFactory(
  configService: ConfigService,
): JwtModuleOptions {
  return {
    secret: configService.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: configService.get<string>(
        'JWT_EXPIRES_IN',
        '7d',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    },
  };
}
