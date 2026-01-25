import { Router,Response } from 'express';
import { createStudent, getMyProfile,updateStudentByTeacher,changeMyPassword,getTotalStudentsClassWise,getMyStudents,bulkUploadStudents,createStudentByPrincipal,getSchoolStudents,bulkUploadStudentsSchoolWide, getStudentsByClass,getStudentById } from '../controllers/student.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { enforceStudentLimit } from '../middleware/planLimit.middleware';

import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadCSV } from '../middleware/upload.middleware';
import { createStudentSchema,updateStudentSchema,changePasswordSchema } from '../config/zod.schema';


const router = Router();

const createStudentHandler = (req: AuthRequest, res: Response) => {
  if (req.user!.roles.includes('teacher')) {
    return createStudent(req, res);
  }
  return createStudentByPrincipal(req, res);
};

router.post(
  '/',
  authMiddleware,
  allowRoles(['teacher', 'principal']),
  enforceStudentLimit,
  validate(createStudentSchema),
  createStudentHandler
);




/* 
   TEACHER: ADD STUDENT
 */
// router.post(
//   '/',
//   authMiddleware,
//   allowRoles(['teacher','principal']),
//   validate(createStudentSchema),
//   createStudent
// );

// router.post(
//   '/',
//   authMiddleware,
//   allowRoles(['teacher', 'principal']),
//   validate(createStudentSchema),
//   (req: AuthRequest, res: Response) => {
//     if (req.user!.role === 'teacher') {
//       return createStudent(req, res);
//     }
//     return createStudentByPrincipal(req, res);
//   }
// );




/*
   STUDENT: MY PROFILE
 */
router.get(
  '/me',
  authMiddleware,
  allowRoles(['student']),
  getMyProfile
);

/*
   TEACHER: UPDATE STUDENT PROFILE
 */
router.put(
  '/:id',
  authMiddleware,
  allowRoles(['teacher','principal']),
  validate(updateStudentSchema),
  updateStudentByTeacher
);

/* 
   STUDENT: CHANGE OWN PASSWORD
 */
router.put(
  '/me/password',
  authMiddleware,
  allowRoles(['student']),
  validate(changePasswordSchema),
  changeMyPassword
);

router.get(
  '/school-students',
  authMiddleware,
  allowRoles(['principal']),
  getSchoolStudents
);

/* =====================================================
   GET FULL STUDENT DETAILS
   principal | teacher | student (self only)
===================================================== */
router.get(
  '/:id',
  authMiddleware,
  allowRoles(['principal', 'teacher', 'student']),
  getStudentById
);


/* =====================================================
   PRINCIPAL DASHBOARD get all student class wise
===================================================== */
router.get(
  '/stats/class-wise',
  authMiddleware,
  allowRoles(['principal']),
  getTotalStudentsClassWise
);

/* =====================================================
   TEACHER: MY STUDENTS 
===================================================== */
router.get(
  '/my-students',
  authMiddleware,
  allowRoles(['teacher']),
  getMyStudents
);

router.get(
  '/class/:classId/students',
  authMiddleware,
  allowRoles(['principal']),
  getStudentsByClass
);

//upload bulk students
router.post(
  '/bulk-upload',
  authMiddleware,
  allowRoles(['teacher', 'principal']),
  enforceStudentLimit,
  uploadCSV.single('csvFile'),
  bulkUploadStudents
);

router.post(
  '/bulk-upload-school',
  authMiddleware,
  allowRoles(['principal']),
  enforceStudentLimit,
  uploadCSV.single('csvFile'),
  bulkUploadStudentsSchoolWide
);

export default router;
