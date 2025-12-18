import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';

export const createClass = async (req: AuthRequest, res: Response) => {
  const cls = await ClassService.createClass({
    ...req.body,
    schoolId: req.user!.schoolId as any
  });

  res.status(201).json(cls);
};

export const getClasses = async (req: AuthRequest, res: Response) => {
  const classes = await ClassService.getClasses(
    req.user!.schoolId as any,
    req.query.sessionId as any
  );

  res.json(classes);
};


