import { Response } from 'express';
import { StudentService } from '../services/student.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { Session } from '../models/Session';

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
// export const getMyProfile = async (req: AuthRequest, res: Response) => {
//   const studentId = req.user!.userId;

//   const student = await StudentService.getMyProfile(studentId);

//   res.status(200).json(student);
// };
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  // const student = await StudentService.getMyProfile(req.user!.userId);

  // res.status(200).json({
  //   user: student   // ✅ WRAP INSIDE user
  // });

  const student = await StudentService.getMyProfile(req.user!.userId);
  
    if (!student) {
      return res.status(404).json({
        message: "student not found"
      });
    }
  
    res.status(200).json({
      user: {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: "student"
      }
    });
};

/* =====================================================
   PRINCIPAL: TOTAL STUDENTS CLASS WISE
===================================================== */
export const getTotalStudentsClassWise = async (
  req: AuthRequest,
  res: Response
) => {
  const activeSession = await Session.findOne({
    schoolId: req.user!.schoolId,
    isActive: true
  });

  if (!activeSession) {
    res.json([]);
    return;
  }

  const result = await StudentService.getTotalStudentsClassWise(
    req.user!.schoolId as any,
    activeSession._id
  );

  res.json(result);
};

/* =====================================================
   TEACHER: MY STUDENTS list of students class wise
===================================================== */
export const getMyStudents = async (
  req: AuthRequest,
  res: Response
) => {
  const teacherId = req.user!.userId;

  const students = await StudentService.getMyStudents(teacherId);

  res.json(students);
};
