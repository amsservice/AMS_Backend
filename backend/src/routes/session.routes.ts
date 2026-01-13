



import { Router } from 'express';
import {
  createSession,
  getSessions,
  updateSession,
  deleteSession
} from '../controllers/session.controller';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';

import {
  createSessionSchema,
  updateSessionSchema,
  deleteSessionSchema
} from '../config/zod.schema';

const router = Router();

/* =========================
   AUTH MIDDLEWARE
========================= */
router.use(authMiddleware);

/* =========================
   CREATE SESSION (Principal)
========================= */
router.post(
  '/',
  allowRoles(['principal']),
  validate(createSessionSchema),
  createSession
);

/* =========================
   GET SESSIONS (Role-based)
========================= */
router.get('/', getSessions);

/* =========================
   UPDATE SESSION
   - Edit details
   - Activate / Deactivate
========================= */
router.put(
  '/:id',
  allowRoles(['principal']),
  validate(updateSessionSchema),
  updateSession
);

/* =========================
   DELETE SESSION
   - ONLY inactive sessions
========================= */

router.delete(
  '/:id',
  allowRoles(['principal']),
  deleteSession
);

export default router;

