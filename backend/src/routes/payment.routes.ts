


import { Router } from 'express';
import {  createPaymentIntent, verifyPayment } from '../controllers/payment.controller';

const router = Router();

/* ===============================
   RAZORPAY PAYMENT VERIFY
=============================== */
router.post('/create-intent', createPaymentIntent);
router.post('/verify', verifyPayment);

export default router;

