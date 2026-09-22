import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const ACCESS_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2h, igual al expiresIn del JWT

export function buildAccessTokenCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  };
}
