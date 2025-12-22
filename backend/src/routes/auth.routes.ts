
import { Router } from 'express';
import {
  registerSchool,
  loginPrincipal,
  logout,
  updatePrincipalProfile,
  getPrincipalProfile ,
  loginTeacher,loginStudent
} from '../controllers/auth.controller';

import { validate } from '../middleware/validate.middleware';
import {
  registerSchoolSchema,
  loginSchema,
  updatePrincipalSchema
} from '../config/zod.schema';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

/*
   SCHOOL REGISTRATION (PUBLIC) 
 */
router.post(
  '/register-school',
  validate(registerSchoolSchema),
  registerSchool
);

/* 
   PRINCIPAL LOGIN
 */
router.post(
  '/principal/login',
  validate(loginSchema),
  loginPrincipal
);

/* 
   PRINCIPAL UPDATE PROFILE (PROTECTED)
 */
router.put(
  '/principal/profile',
  authMiddleware,
  allowRoles(['principal']),
  validate(updatePrincipalSchema),
  updatePrincipalProfile
);

router.get(
  '/principal/me',
  authMiddleware,
  allowRoles(['principal']),
  getPrincipalProfile
);

/// login teacher route

router.post(
  '/teacher/login',
  validate(loginSchema),
  loginTeacher
);

/* ======================================================
   STUDENT LOGIN
====================================================== */
router.post(
  '/student/login',
  validate(loginSchema),
  loginStudent
);


/*
   LOGOUT (STATELESS JWT)
 */
router.post(
  '/logout',
  authMiddleware,
  logout
);

export default router;
