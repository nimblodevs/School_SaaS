import type { CookieOptions, Response } from "express";
import { env } from "../../config/env.js";

export const ACCESS_TOKEN_COOKIE = "school_saas_access";
export const REFRESH_TOKEN_COOKIE = "school_saas_refresh";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ACCESS_TOKEN_COOKIE_PATH = "/api/v1";
export const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth/refresh";

export function readCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  const values: string[] = [];
  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");
    if (separatorIndex < 0 || cookie.slice(0, separatorIndex).trim() !== name) {
      continue;
    }

    const rawValue = cookie.slice(separatorIndex + 1).trim();
    try {
      values.push(decodeURIComponent(rawValue));
    } catch {
      return undefined;
    }
  }

  return values.length === 1 && values[0] ? values[0] : undefined;
}

function cookieOptions(path: string, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path,
    maxAge: maxAge * 1000,
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    cookieOptions(ACCESS_TOKEN_COOKIE_PATH, ACCESS_TOKEN_TTL_SECONDS),
  );
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    cookieOptions(REFRESH_TOKEN_COOKIE_PATH, REFRESH_TOKEN_TTL_SECONDS),
  );
}

export function clearAuthCookies(res: Response): void {
  const { maxAge: _accessMaxAge, ...accessOptions } = cookieOptions(
    ACCESS_TOKEN_COOKIE_PATH,
    ACCESS_TOKEN_TTL_SECONDS,
  );
  const { maxAge: _refreshMaxAge, ...refreshOptions } = cookieOptions(
    REFRESH_TOKEN_COOKIE_PATH,
    REFRESH_TOKEN_TTL_SECONDS,
  );
  res.clearCookie(ACCESS_TOKEN_COOKIE, accessOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshOptions);
}
