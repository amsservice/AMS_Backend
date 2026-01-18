import { Router } from 'express';
import { getMySchool, updateMySchool,getSchoolByCode } from '../controllers/school.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { allowRoles } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateSchoolSchema } from '../config/zod.schema';

const router = Router();

router.get('/by-code/:code', getSchoolByCode);

router.use(authMiddleware, allowRoles(['principal', 'teacher', 'student']));

router.get('/me', getMySchool);
router.put('/me', validate(updateSchoolSchema), updateMySchool);


export default router;
