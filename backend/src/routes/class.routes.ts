import { Router } from 'express';
import {
  createClass,
  getClasses
} from '../controllers/class.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(allowRoles(['principal']));

router.post('/', createClass);
router.get('/', getClasses);

export default router;
