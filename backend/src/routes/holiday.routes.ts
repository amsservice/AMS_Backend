import { Router } from 'express';
import {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday
} from '../controllers/holiday.controller';

import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);

/* READ (ALL ROLES) */
router.get(
  '/',
  allowRoles(['principal', 'coordinator', 'teacher', 'student']),
  getHolidays
);

/* WRITE (PRINCIPAL ONLY) */
router.post('/', allowRoles(['principal', 'coordinator']), createHoliday);
router.put('/:id', allowRoles(['principal', 'coordinator']), updateHoliday);
router.delete('/:id', allowRoles(['principal', 'coordinator']), deleteHoliday);

export default router;
