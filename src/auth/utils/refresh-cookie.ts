import type { Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
};

export function setRefreshCookie(
  response: Response,
  refreshToken: string,
  expiresAt: Date,
): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}
