// import { Router } from 'express';
// import {
  
//   registerSchool
// } from '../controllers/auth.controller';
// import { validate } from '../middleware/validate.middleware';
// import { registerSchoolSchema } from '../config/zod.schema';

// const router = Router();

// // registration
// router.post(
//   '/register-school',
//   validate(registerSchoolSchema),
//   registerSchool
// );



// export default router;



import { Router } from 'express';
import {
  registerSchool,
  loginPrincipal,
  logout,
  updatePrincipalProfile,
  getPrincipalProfile 
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

/* ======================================================
   SCHOOL REGISTRATION (PUBLIC)
====================================================== */
router.post(
  '/register-school',
  validate(registerSchoolSchema),
  registerSchool
);

/* ======================================================
   PRINCIPAL LOGIN
 */
router.post(
  '/principal/login',
  validate(loginSchema),
  loginPrincipal
);

/* ======================================================
   PRINCIPAL UPDATE PROFILE (PROTECTED)
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
   LOGOUT (STATELESS JWT)
====================================================== */
router.post(
  '/logout',
  authMiddleware,
  logout
);

export default router;
