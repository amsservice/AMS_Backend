



import { Router } from 'express';
import {
  createPaymentIntent,
  verifyPayment
} from '../controllers/payment.controller';

const router = Router();

/* ===============================
   CREATE PAYMENT INTENT
================================ */
router.post('/create-intent', createPaymentIntent);

/* ===============================
   VERIFY PAYMENT (RAZORPAY)
================================ */
router.post('/verify', verifyPayment);

export default router;
