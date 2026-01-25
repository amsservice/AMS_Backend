import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const allowRoles =
  (allowedRoles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRoles = req.user.roles;

    const hasAccess = userRoles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
