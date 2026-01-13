import { Router } from 'express';
import { createContactMessage } from '../controllers/contact.controller';
import { validate } from '../middleware/validate.middleware';
import { contactMessageSchema } from '../config/zod.schema';

const router = Router();

router.post('/', validate(contactMessageSchema), createContactMessage);

export default router;
