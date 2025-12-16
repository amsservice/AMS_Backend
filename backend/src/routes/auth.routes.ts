import { Router } from 'express';
import {
  
  registerSchool
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchoolSchema } from '../config/zod.schema';

const router = Router();

// registration
router.post(
  '/register-school',
  validate(registerSchoolSchema),
  registerSchool
);



export default router;
