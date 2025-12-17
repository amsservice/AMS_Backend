import { Router } from 'express';
import {
  createSession,
  getSessions,
  updateSession
} from '../controllers/session.controller';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createSessionSchema,
  updateSessionSchema
} from '../config/zod.schema';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  allowRoles(['principal']),
  validate(createSessionSchema),
  createSession
);

router.get('/', getSessions);

router.put(
  '/:id',
  allowRoles(['principal']),
  validate(updateSessionSchema),
  updateSession
);

export default router;
