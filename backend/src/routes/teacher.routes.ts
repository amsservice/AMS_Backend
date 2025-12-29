import { Router } from 'express';
import {
  createTeacher,
  listTeachers,
  updateTeacher,
  deleteTeacher,
  getMyProfile,
  updateMyProfile,
  assignClassToTeacher, 
  changeMyPassword,
  getActiveTeacherCount
} from '../controllers/teacher.controller';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createTeacherSchema,
  updateTeacherSchema,
  updateMyProfileSchema,
  changePasswordSchema
} from '../config/zod.schema';

const router = Router();

router.use(authMiddleware);

/* 
   TEACHER SELF
 */
router.get('/me', allowRoles(['teacher']), getMyProfile);
router.put(
  '/me',
  allowRoles(['teacher']),
  validate(updateMyProfileSchema),
  updateMyProfile
);

/* 
   PRINCIPAL MANAGE TEACHERS
 */
router.post(
  '/',
  allowRoles(['principal']),
  validate(createTeacherSchema),
  createTeacher
);

router.get('/', allowRoles(['principal']), listTeachers);

router.put(
  '/:id',
  allowRoles(['principal']),
  validate(updateTeacherSchema),
  updateTeacher
);

router.delete(
  '/:id',
  allowRoles(['principal']),
  deleteTeacher
);

/* 
   PRINCIPAL ASSIGN CLASS
 */
router.post(
  '/:id/assign-class',
  allowRoles(['principal']),
  assignClassToTeacher
);


/* ======================================================
   TEACHER: CHANGE OWN PASSWORD
====================================================== */
router.put(
  '/me/password',
  authMiddleware,
  allowRoles(['teacher']),
  validate(changePasswordSchema),
  changeMyPassword
);



/* ======================================================
   PRINCIPAL DASHBOARD
   ACTIVE TEACHER STATS (SESSION WISE)
====================================================== */
router.get(
  '/active-teachers',
  allowRoles(['principal']),
  getActiveTeacherCount
);



export default router;
