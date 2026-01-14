


import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'principal' | 'teacher' | 'student';
    schoolId: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  console.log('AUTH USER:', req.user);

};


