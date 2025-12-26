import { Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription';
import { AuthRequest } from './auth.middleware';

export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const subscription = await Subscription.findOne({
    schoolId: req.user!.schoolId,
    status: 'active'
  });

  if (!subscription) {
    return res.status(403).json({
      message: 'Subscription expired. Please renew.'
    });
  }

  next();
};
