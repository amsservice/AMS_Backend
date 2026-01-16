
import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { SchoolService } from '../services/school.service';

export const getMySchool = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const schoolId = new Types.ObjectId(req.user!.schoolId);

    const school = await SchoolService.getSchool(schoolId);

    res.status(200).json({ school });
  } catch (error) {
    next(error); // 👈 centralized error handler
  }
};

export const updateMySchool = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const schoolId = new Types.ObjectId(req.user!.schoolId);

    const school = await SchoolService.updateSchool(
      schoolId,
      req.body
    );

    res.status(200).json({ school });
  } catch (error) {
    next(error);
  }
};


/* ======================================================
   GET SCHOOL BY CODE
====================================================== */
export const getSchoolByCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const schoolCode = Number(req.params.code);

    const school = await SchoolService.getSchoolByCode(schoolCode);

    res.status(200).json({ school });
  } catch (error) {
    next(error); // centralized error handler
  }
};

