import jwt from "jsonwebtoken";
import { Response, CookieOptions } from "express";
import { ENV } from "../config/env";

export type UserRole = "principal" | "teacher" | "student" | "admin" | "coordinator";

export interface JwtPayload {
  userId: string;
  roles: UserRole[];
  schoolId: string;
}

/* ======================================================
   TOKEN SIGNING
====================================================== */

export const signAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, { expiresIn: "7d" });
};

export const signRefreshToken = (payload: JwtPayload) => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, { expiresIn: "60d" });
};

/* ======================================================
   TOKEN VERIFICATION
====================================================== */

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as JwtPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") throw new Error("Access token expired");
    throw new Error("Invalid access token");
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as JwtPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") throw new Error("Refresh token expired");
    throw new Error("Invalid refresh token");
  }
};

/* ======================================================
   COOKIE MANAGEMENT
====================================================== */
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 24 * 60 * 60 * 1000, // 60 Days
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};