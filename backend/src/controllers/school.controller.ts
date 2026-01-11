// import { Response } from 'express';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { SchoolService } from '../services/school.service';

// export const getMySchool = async (req: AuthRequest, res: Response) => {
//   const school = await SchoolService.getSchool(req.user!.schoolId as any);
//   res.json(school);
// };

// export const updateMySchool = async (req: AuthRequest, res: Response) => {
//   const school = await SchoolService.updateSchool(
//     req.user!.schoolId as any,
//     req.body
//   );
//   res.json(school);
// };


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
