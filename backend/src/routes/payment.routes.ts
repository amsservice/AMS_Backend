


import { Router } from 'express';
import {
  createPaymentIntent,
  verifyPayment,
  createUpgradePaymentIntent,
  verifyUpgradePayment
} from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/* ===============================
   RAZORPAY PAYMENT VERIFY
=============================== */
router.post('/create-intent', createPaymentIntent);
router.post('/verify', verifyPayment);

router.post('/create-intent-upgrade', authMiddleware, createUpgradePaymentIntent);
router.post('/verify-upgrade', authMiddleware, verifyUpgradePayment);

export default router;

