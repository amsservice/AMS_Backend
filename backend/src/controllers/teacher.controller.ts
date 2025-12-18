import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TeacherService } from '../services/teacher.service';
import { AuthRequest } from '../middleware/auth.middleware';


/* 
   PRINCIPAL (MANAGE TEACHERS) pricipal will create teacher,sea list of teacher update teacher
 */
export const createTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teacher = await TeacherService.createTeacher(schoolId, req.body);
  res.status(201).json(teacher);
};

export const listTeachers = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teachers = await TeacherService.listTeachers(schoolId);
  res.status(200).json(teachers);
};

export const updateTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teacher = await TeacherService.updateTeacher(
    schoolId,
    req.params.id,
    req.body
  );

  res.status(200).json(teacher);
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.deleteTeacher(
    schoolId,
    req.params.id
  );

  res.status(200).json(result);
};


/* 
   ASSIGN CLASS TO TEACHER (PRINCIPAL ONLY)
*/
export const assignClassToTeacher = async (
  req: AuthRequest,
  res: Response
) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.assignClass(schoolId, {
    teacherId: req.params.id,
    sessionId: new Types.ObjectId(req.body.sessionId),
    classId: new Types.ObjectId(req.body.classId),
    className: req.body.className,
    section: req.body.section
   
  });

  res.status(200).json(result);
};



/* 
   TEACHER (SELF) teacher can see their profile and update 
 */
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const teacher = await TeacherService.getMyProfile(req.user!.userId);
  res.status(200).json(teacher);
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const teacher = await TeacherService.updateMyProfile(
    req.user!.userId,
    req.body
  );
  res.status(200).json(teacher);
};