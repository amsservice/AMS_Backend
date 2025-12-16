import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export type UserRole = 'principal' | 'teacher' | 'student';

export const signJwt = (payload: {
  userId: string;
  role: UserRole;
  schoolId: string;
}) => {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyJwt = (token: string) => {
  return jwt.verify(token, ENV.JWT_SECRET);
};
