import { Router } from 'express';
import { createStudent, getMyProfile,updateStudentByTeacher,changeMyPassword } from '../controllers/student.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createStudentSchema,updateStudentSchema,changePasswordSchema } from '../config/zod.schema';


const router = Router();

/* 
   TEACHER: ADD STUDENT
 */
router.post(
  '/',
  authMiddleware,
  allowRoles(['teacher']),
  validate(createStudentSchema),
  createStudent
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
  allowRoles(['teacher']),
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

export default router;
