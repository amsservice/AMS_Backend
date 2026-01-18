import {Request, Response, NextFunction } from 'express';
import { 
  verifyAccessToken, 
  verifyRefreshToken, 
  signAccessToken, 
  signRefreshToken, 
  setAuthCookies,
  UserRole 
} from '../utils/jwt';

export interface AuthRequest extends Request {
  cookies: {
    accessToken?: string;
    refreshToken?: string;
  };
  user?: {
    userId: string;
    role: UserRole;
    schoolId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { accessToken, refreshToken } = req.cookies;

  // 1. Try to verify Access Token
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      req.user = decoded;
      return next();
    } catch (error: any) {
      // Continue to refresh logic only if the error is an expiry
      if (error.message !== 'Access token expired') {
        return res.status(401).json({ message: 'Invalid session' });
      }
    }
  }

  // 2. If Access Token is missing/expired, try Refresh Token
  if (!refreshToken) {
    return res.status(401).json({ message: 'Unauthorized: Session expired' });
  }

  try {
    // 3. Verify Refresh Token
    const payload = verifyRefreshToken(refreshToken);

    // 4. GENERATE NEW PAIR (Rotation)
    const newAccess = signAccessToken({
      userId: payload.userId,
      role: payload.role,
      schoolId: payload.schoolId
    });

    const newRefresh = signRefreshToken({
      userId: payload.userId,
      role: payload.role,
      schoolId: payload.schoolId
    });

    // 5. SET NEW COOKIES (Silent Refresh)
    setAuthCookies(res, newAccess, newRefresh);

    req.user = payload;
    next();
  } catch (error: any) {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
};