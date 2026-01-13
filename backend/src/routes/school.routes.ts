import { Router } from 'express';
import { getMySchool, updateMySchool } from '../controllers/school.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware, allowRoles(['principal', 'teacher', 'student']));

router.get('/me', getMySchool);
router.put('/me', updateMySchool);

export default router;
