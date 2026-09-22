import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { APP_CONFIG } from '../../config/configuration';
import type { AppConfig } from '../../config/configuration';
import { PlatformRole } from '../../modules/auth/domain/platform-user.entity';
import { ACCESS_TOKEN_COOKIE } from './auth-cookie';

function extractFromCookie(req: Request): string | null {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

export interface JwtPayload {
  sub: string;
  role: PlatformRole;
  iat: number;
  exp: number;
}

export interface RequestUser {
  sub: string;
  role: PlatformRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    return { sub: payload.sub, role: payload.role };
  }
}
