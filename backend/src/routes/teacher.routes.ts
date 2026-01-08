// import { Router } from 'express';
// import {
//   createTeacher,
//   listTeachers,
//   updateTeacher,
//   deleteTeacher,
//   getMyProfile,
//   updateMyProfile,
//   assignClassToTeacher, 
//   changeMyPassword,
//   getActiveTeacherCount,
//   deactivateTeacher,
//   swapTeacherClasses
// } from '../controllers/teacher.controller';

// import { authMiddleware } from '../middleware/auth.middleware';
// import { allowRoles } from '../middleware/role.middleware';
// import { validate } from '../middleware/validate.middleware';
// import {
//   createTeacherSchema,
//   updateTeacherSchema,
//   updateMyProfileSchema,
//   changePasswordSchema
// } from '../config/zod.schema';

// const router = Router();

// router.use(authMiddleware);

// /* 
//    TEACHER SELF
//  */
// router.get('/me', allowRoles(['teacher']), getMyProfile);
// router.put(
//   '/me',
//   allowRoles(['teacher','principal']),
//   validate(updateMyProfileSchema),
//   updateMyProfile
// );

// /* 
//    PRINCIPAL MANAGE TEACHERS
//  */
// router.post(
//   '/',
//   allowRoles(['principal']),
//   validate(createTeacherSchema),
//   createTeacher
// );

// router.get('/', allowRoles(['principal']), listTeachers);

// router.put(
//   '/:id',
//   allowRoles(['principal']),
//   validate(updateTeacherSchema),
//   updateTeacher
// );

// router.delete(
//   '/:id',
//   allowRoles(['principal']),
//   deleteTeacher
// );

// /* 
//    PRINCIPAL ASSIGN CLASS
//  */
// router.post(
//   '/:id/assign-class',
//   allowRoles(['principal']),
//   assignClassToTeacher
// );
// //deactivate teacher
// router.put('/:teacherId/deactivate', deactivateTeacher);


// /* ======================================================
//    TEACHER: CHANGE OWN PASSWORD
// ====================================================== */
// router.put(
//   '/me/password',
//   authMiddleware,
//   allowRoles(['teacher']),
//   validate(changePasswordSchema),
//   changeMyPassword
// );



// /* ======================================================
//    PRINCIPAL DASHBOARD
//    ACTIVE TEACHER STATS (SESSION WISE)
// ====================================================== */
// router.get(
//   '/active-teachers',
//   allowRoles(['principal']),
//   getActiveTeacherCount
// );


// //swape teacher routes
// router.put(
//   '/swap-classes',
//   authMiddleware,
//   allowRoles(['principal']),
//   swapTeacherClasses
// );



// export default router;


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
  getActiveTeacherCount,
  deactivateTeacher,
  swapTeacherClasses
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

/* =========================
   FIXED / STATIC ROUTES FIRST
========================= */

// 🔥 SWAP TEACHERS (MUST BE FIRST)
router.put(
  '/swap-classes',
  allowRoles(['principal']),
  swapTeacherClasses
);

/* =========================
   TEACHER SELF
========================= */

router.get('/me', allowRoles(['teacher']), getMyProfile);

router.put(
  '/me',
  allowRoles(['teacher', 'principal']),
  validate(updateMyProfileSchema),
  updateMyProfile
);

router.put(
  '/me/password',
  allowRoles(['teacher']),
  validate(changePasswordSchema),
  changeMyPassword
);

/* =========================
   PRINCIPAL DASHBOARD
========================= */

router.get(
  '/active-teachers',
  allowRoles(['principal']),
  getActiveTeacherCount
);

/* =========================
   PRINCIPAL MANAGE TEACHERS
========================= */

router.post(
  '/',
  allowRoles(['principal']),
  validate(createTeacherSchema),
  createTeacher
);

router.get('/', allowRoles(['principal']), listTeachers);

/* =========================
   CLASS & TEACHER ACTIONS
========================= */

// assign class
router.post(
  '/:id/assign-class',
  allowRoles(['principal']),
  assignClassToTeacher
);

// deactivate teacher
router.put(
  '/:teacherId/deactivate',
  allowRoles(['principal']),
  deactivateTeacher
);

// update teacher
router.put(
  '/:id',
  allowRoles(['principal']),
  validate(updateTeacherSchema),
  updateTeacher
);

// ❌ OPTIONAL: you SHOULD remove hard delete
router.delete(
  '/:id',
  allowRoles(['principal']),
  deleteTeacher
);

export default router;
