// import { Response, NextFunction } from 'express';
// import { AuthRequest } from './auth.middleware';

// export const allowRoles =
//   (roles: string[]) =>
//   (req: AuthRequest, res: Response, next: NextFunction) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return res.status(403).json({ message: 'Forbidden' });
//     }
//     next();
//   };


import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const allowRoles =
  (roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };

