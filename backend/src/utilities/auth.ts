import { type Response, type CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { AppConfig } from "../config/AppConfig";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const REFRESH_PATH = "/api/auth/refresh";

// settings shared by both cookies
const baseCookie: CookieOptions = {
    httpOnly: true,                    // JavaScript in the browser cannot read it (protects from XSS)
    secure: AppConfig.isProduction,    // https only in production
    sameSite: "lax",
    domain: AppConfig.cookieDomain,    // undefined in development
}

/**
 * @description Create both tokens and store them in cookies
 */
export const setAuthCookies = (res: Response, userId: string) => {
    const accessToken = jwt.sign({ sub: userId, typ: "Bearer" }, AppConfig.jwtSecret, {
        expiresIn: AppConfig.accessTokenMinutes * 60,
    })
    const refreshToken = jwt.sign({ sub: userId, typ: "Refresh" }, AppConfig.jwtRefreshSecret, {
        expiresIn: AppConfig.refreshTokenDays * 24 * 60 * 60,
    })

    res.cookie(ACCESS_COOKIE, accessToken, {
        ...baseCookie,
        path: "/",
        maxAge: AppConfig.accessTokenMinutes * 60 * 1000,
    })
    // the refresh cookie is only sent to the refresh route
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...baseCookie,
        path: REFRESH_PATH,
        maxAge: AppConfig.refreshTokenDays * 24 * 60 * 60 * 1000,
    })
}

/**
 * @description Remove both cookies. Must use the same path and options they were created with
 */
export const clearAuthCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE, { ...baseCookie, path: "/" });
    res.clearCookie(REFRESH_COOKIE, { ...baseCookie, path: REFRESH_PATH });
}