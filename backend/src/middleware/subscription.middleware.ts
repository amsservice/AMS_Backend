import { Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription';
import { AuthRequest } from './auth.middleware';
import { SubscriptionService } from '../services/subscription.service';

export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await SubscriptionService.transitionForSchool(req.user!.schoolId as any);

  const subscription = await Subscription.findOne({
    schoolId: req.user!.schoolId,
    status: { $in: ['active', 'grace'] }
  });

  if (!subscription) {
    return res.status(403).json({
      message: 'Subscription expired. Please renew.'
    });
  }

  next();
};
