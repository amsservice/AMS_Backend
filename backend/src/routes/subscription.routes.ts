



import { Router } from 'express';
import {
  getPlans,
  previewPrice,
  createPayment,
   renewSubscription ,
    getBillableStudents
} from '../controllers/subscription.controller';

import { authMiddleware } from '../middleware/auth.middleware';

import { validate } from '../middleware/validate.middleware';
import {
  pricePreviewSchema,
  createPaymentSchema,
  renewSubscriptionSchema 
} from '../config/zod.schema';

const router = Router();

/* ===============================
   PUBLIC SUBSCRIPTION ROUTES
=============================== */

// Get all subscription plans
router.get('/plans', getPlans);

// Preview price (students + coupon)
router.post(
  '/price-preview',
  validate(pricePreviewSchema),
  previewPrice
);

// Create payment (discount applied)
router.post(
  '/create-payment',
  validate(createPaymentSchema),
  createPayment
);
//renew subscription
router.post('/renew',validate(renewSubscriptionSchema), renewSubscription);

/* ===============================
   BILLABLE STUDENTS (PRINCIPAL)
================================ */
router.get(
  '/billable-students',
  authMiddleware,
  getBillableStudents
);

export default router;
