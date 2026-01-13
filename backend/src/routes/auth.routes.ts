


import { Router } from 'express';
import {
  registerSchool,
  verifySchoolOtp,
  loginPrincipal,
  logout,
  updatePrincipalProfile,
  getPrincipalProfile,
  loginTeacher,
  loginStudent
} from '../controllers/auth.controller';

import { validate } from '../middleware/validate.middleware';
import {
  registerSchoolSchema,
  loginSchema,
  updatePrincipalSchema,
  verifyOtpSchema,
  resendOtpSchema
} from '../config/zod.schema';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { resendSchoolOtp } from '../controllers/auth.controller';


const router = Router();

/* ======================================================
   REGISTER SCHOOL (PUBLIC)
====================================================== */
router.post(
  '/register-school',
  validate(registerSchoolSchema),
  registerSchool
);

/* ======================================================
   VERIFY EMAIL OTP (PUBLIC)
====================================================== */
router.post(
  '/verify-otp',
  validate(verifyOtpSchema),
  verifySchoolOtp
);

/* ======================================================
   PRINCIPAL LOGIN
====================================================== */
router.post(
  '/principal/login',
  validate(loginSchema),
  loginPrincipal
);

/* ======================================================
   PRINCIPAL PROFILE (PROTECTED)
====================================================== */
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

/* ======================================================
   TEACHER LOGIN
====================================================== */
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

/* ======================================================
   LOGOUT
====================================================== */
router.post(
  '/logout',
  authMiddleware,
  logout
);

router.post(
  '/resend-otp',
  validate(resendOtpSchema),
  resendSchoolOtp
);

export default router;
