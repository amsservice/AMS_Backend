import { Response } from 'express';
import { StudentService } from '../services/student.service';
import { AuthRequest } from '../middleware/auth.middleware';

/* 
   TEACHER: ADD STUDENT
 */
export const createStudent = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.userId;

  const result = await StudentService.createStudentByTeacher(
    teacherId,
    req.body
  );

  res.status(201).json(result);
};


/* 
   TEACHER: UPDATE STUDENT PROFILE
*/
export const updateStudentByTeacher = async (
  req: AuthRequest,
  res: Response
) => {
  const teacherId = req.user!.userId;
  const studentId = req.params.id;

  const result = await StudentService.updateStudentByTeacher(
    teacherId,
    studentId,
    req.body
  );

  res.status(200).json(result);
};

/* 
   STUDENT: CHANGE OWN PASSWORD
 */
export const changeMyPassword = async (
  req: AuthRequest,
  res: Response
) => {
  const studentId = req.user!.userId;
  const { oldPassword, newPassword } = req.body;

  const result = await StudentService.changeMyPassword(
    studentId,
    oldPassword,
    newPassword
  );

  res.status(200).json(result);
};

/*
   STUDENT: GET OWN PROFILE
 */
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.userId;

  const student = await StudentService.getMyProfile(studentId);

  res.status(200).json(student);
};
