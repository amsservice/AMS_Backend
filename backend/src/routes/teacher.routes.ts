import { Router } from 'express';
import {
  createTeacher,
  bulkUploadTeachers,
  listTeachers,
  updateTeacher,
  deleteTeacher,
  getMyProfile,
  updateMyProfile,
  assignClassToTeacher, 
  changeMyPassword,
  getActiveTeacherCount,
  deactivateTeacher,
  activateTeacher,
  swapTeacherClasses,
  getTeacherFullProfileByRole,
  updateTeacherProfileByRole
} from '../controllers/teacher.controller';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadCSV } from '../middleware/upload.middleware';
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
  allowRoles(['teacher','principal']),
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

router.post(
  '/bulk-upload',
  allowRoles(['principal']),
  uploadCSV.single('csvFile'),
  bulkUploadTeachers
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
//deactivate teacher
router.put('/:teacherId/deactivate', allowRoles(['principal']), deactivateTeacher);

//activate teacher
router.put('/:teacherId/activate', allowRoles(['principal']), activateTeacher);


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


//swape teacher routes
router.put(
  '/swap-classes',
  authMiddleware,
  allowRoles(['principal']),
  swapTeacherClasses
);


/* ======================================================
   FULL TEACHER PROFILE
====================================================== */

// Teacher → own profile
router.get(
  '/me/full',
  allowRoles(['teacher']),
  getTeacherFullProfileByRole
);

// Principal → any teacher profile
router.get(
  '/:id/full',
  allowRoles(['principal']),
  getTeacherFullProfileByRole
);

// update teacher profile (profile fields only)
router.put(
  '/:id/profile',
  allowRoles(['principal']),
  validate(updateMyProfileSchema),
  updateTeacherProfileByRole
);


export default router;

