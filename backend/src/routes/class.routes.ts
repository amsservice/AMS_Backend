import { Router } from 'express';
import {
  createClass,
  getClasses,
  getTotalClasses,
  updateClass,
   deleteClass,
   bulkDeleteClasses
} from '../controllers/class.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(allowRoles(['principal', 'coordinator']));

router.post('/', createClass);
router.get('/', getClasses);


/* =====================================
   UPDATE CLASS
===================================== */
router.put(
  '/:id',
  allowRoles(['principal', 'coordinator' ]),

  updateClass
);

/* =====================================
   DELETE CLASS
===================================== */
router.delete(
  '/:id',
  allowRoles(['principal', 'coordinator']),
  
  deleteClass
);

router.post(
  '/bulk-deactivate',
  allowRoles(['principal', 'coordinator']),
  bulkDeleteClasses
);

router.get(
  '/totalclass',
  allowRoles(['principal', 'coordinator']),
  getTotalClasses
);

export default router;
