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
  allowRoles(['principal', 'teacher', 'student']),
  getHolidays
);

/* WRITE (PRINCIPAL ONLY) */
router.post('/', allowRoles(['principal']), createHoliday);
router.put('/:id', allowRoles(['principal']), updateHoliday);
router.delete('/:id', allowRoles(['principal']), deleteHoliday);

export default router;
