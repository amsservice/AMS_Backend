import { Router } from 'express';
import {
  createStaff,
  bulkUploadStaff,
  listStaff,
  updateStaff,
  deleteStaff,
  getMyProfile,
  updateMyProfile,
  assignClassToStaff,
  changeMyPassword,
  getActiveTeacherCount,
  deactivateStaff,
  activateStaff,
  getStaffFullProfileByRole,
  updateStaffProfileByRole,
  bulkDeactivateStaff
} from '../controllers/staff.controller';

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
import { swapStaffClasses } from '../controllers/staff.controller';

const router = Router();

router.use(authMiddleware);

/* ======================================================
   STAFF SELF
====================================================== */

router.get('/me', allowRoles(['teacher','coordinator']), getMyProfile);

router.put(
  '/me',
  allowRoles(['teacher','coordinator','principal']),
  validate(updateMyProfileSchema),
  updateMyProfile
);

/* ======================================================
   PRINCIPAL MANAGE STAFF
====================================================== */

router.post(
  '/',
  allowRoles(['principal','coordinator']),
  validate(createTeacherSchema), // rename later if you want
  createStaff
);

router.post(
  '/bulk-upload',
  allowRoles(['principal','coordinator']),
  uploadCSV.single('csvFile'),
  bulkUploadStaff
);

router.get('/', allowRoles(['principal','coordinator']), listStaff);

router.post(
  '/bulk-upload',
  allowRoles(['principal', 'coordinator']),
  uploadCSV.single('csvFile'),
  bulkUploadStaff
);

router.put(
  '/:id',
  allowRoles(['principal','coordinator']),
  validate(updateTeacherSchema),
  updateStaff
);

router.delete('/:id', allowRoles(['principal','coordinator']), deleteStaff);

/* ======================================================
   ASSIGN CLASS (TEACHER ROLE ONLY)
====================================================== */

router.post(
  '/:id/assign-class',
  allowRoles(['principal','coordinator']),
  assignClassToStaff
);

router.put('/:id/deactivate', allowRoles(['principal','coordinator']), deactivateStaff);
router.put('/:id/activate', allowRoles(['principal','coordinator']), activateStaff);

router.post(
  '/bulk-deactivate',
  allowRoles(['principal','coordinator']),
  bulkDeactivateStaff
);

/* ======================================================
   PASSWORD
====================================================== */

router.put(
  '/me/password',
  allowRoles(['teacher','coordinator']),
  validate(changePasswordSchema),
  changeMyPassword
);

/* ======================================================
   DASHBOARD
====================================================== */

router.get(
  '/active-teachers',
  allowRoles(['principal','coordinator']),
  getActiveTeacherCount
);

/* ======================================================
   FULL PROFILE
====================================================== */

router.get(
  '/me/full',
  allowRoles(['teacher','coordinator']),
  getStaffFullProfileByRole
);

router.get(
  '/:id/full',
  allowRoles(['principal','coordinator']),
  getStaffFullProfileByRole
);

router.put(
  '/:id/profile',
  allowRoles(['principal','coordinator']),
  validate(updateTeacherSchema),
  updateStaffProfileByRole
);

router.put(
  '/swap-classes',
  allowRoles(['principal','coordinator']),
  swapStaffClasses
);


export default router;
