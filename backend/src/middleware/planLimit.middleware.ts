import { Response, NextFunction } from 'express';
import { Subscription } from '../models/Subscription';
import { Student } from '../models/Student';
import { AuthRequest } from './auth.middleware';

export const enforceStudentLimit = async (
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
      message: 'No active subscription'
    });
  }

  const currentCount = await Student.countDocuments({
    schoolId: req.user!.schoolId,
    status: 'active'
  });

  if (currentCount >= subscription.billableStudents) {
    return res.status(403).json({
      message: 'Student limit reached. Upgrade required.'
    });
  }

  next();
};
