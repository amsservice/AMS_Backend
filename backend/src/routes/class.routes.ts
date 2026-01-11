import { Router } from 'express';
import {
  createClass,
  getClasses,
  getTotalClasses,
  updateClass,
   deleteClass
} from '../controllers/class.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(allowRoles(['principal']));

router.post('/', createClass);
router.get('/', getClasses);


/* =====================================
   UPDATE CLASS
===================================== */
router.put(
  '/:id',
  allowRoles(['principal' ]),

  updateClass
);

/* =====================================
   DELETE CLASS
===================================== */
router.delete(
  '/:id',
  allowRoles(['principal']),
  
  deleteClass
);

router.get(
  '/totalclass',
  allowRoles(['principal']),
  getTotalClasses
);

export default router;
