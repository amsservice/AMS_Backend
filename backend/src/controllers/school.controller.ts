import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

export const getMySchool = async (req: AuthRequest, res: Response) => {
  const school = await SchoolService.getSchool(req.user!.schoolId as any);
  res.json(school);
};

export const updateMySchool = async (req: AuthRequest, res: Response) => {
  const school = await SchoolService.updateSchool(
    req.user!.schoolId as any,
    req.body
  );
  res.json(school);
};
