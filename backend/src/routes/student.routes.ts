import { Router,Response } from 'express';
import { createStudent, getMyProfile,updateStudentByTeacher,changeMyPassword,getTotalStudentsClassWise,getMyStudents,bulkUploadStudents,createStudentByPrincipal,getSchoolStudents,bulkUploadStudentsSchoolWide, getStudentsByClass,getStudentById, deactivateStudent, bulkDeactivateStudents } from '../controllers/student.controller';
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
  allowRoles(['principal', 'coordinator']),
  getSchoolStudents
);

router.put(
  '/:id/deactivate',
  authMiddleware,
  allowRoles(['principal', 'coordinator']),
  deactivateStudent
);

router.post(
  '/bulk-deactivate',
  authMiddleware,
  allowRoles(['principal', 'coordinator']),
  bulkDeactivateStudents
);

/* =====================================================
   PRINCIPAL DASHBOARD get all student class wise
===================================================== */
router.get(
  '/stats/class-wise',
  authMiddleware,
  allowRoles(['principal', 'coordinator']),
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
  allowRoles(['principal', 'coordinator']),
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
  allowRoles(['principal', 'coordinator']),
  enforceStudentLimit,
  uploadCSV.single('csvFile'),
  bulkUploadStudentsSchoolWide
);

/* =====================================================
   GET FULL STUDENT DETAILS
   principal | teacher | student (self only)
===================================================== */
router.get(
  '/:id',
  authMiddleware,
  allowRoles(['principal', 'coordinator', 'teacher', 'student']),
  getStudentById
);

export default router;
