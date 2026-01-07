// import jwt from 'jsonwebtoken';
// import { ENV } from '../config/env';

// export type UserRole = 'principal' | 'teacher' | 'student';

// export const signJwt = (payload: {
//   userId: string;
//   role: UserRole;
//   schoolId: string;
// }) => {
//   return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
// };

// export const verifyJwt = (token: string) => {
//   return jwt.verify(token, ENV.JWT_SECRET);
// };


import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export type UserRole = 'principal' | 'teacher' | 'student';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  schoolId: string;
}

export const signJwt = (payload: JwtPayload) => {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyJwt = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
};
