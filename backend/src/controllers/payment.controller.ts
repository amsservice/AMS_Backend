
import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentIntent } from '../models/PaymentIntent';

/* ===============================
   CREATE PAYMENT INTENT
================================ */
export const createPaymentIntent = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      orderId,
      planId,
      enteredStudents,
      futureStudents,
      couponCode
    } = req.body;

    // ✅ Basic validation
    if (!orderId || !planId || !enteredStudents) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // 🔐 Idempotency: avoid duplicates
    const exists = await PaymentIntent.findOne({ orderId });
    if (exists) {
      return res.status(200).json({
        success: true,
        message: 'Payment intent already exists'
      });
    }

    await PaymentIntent.create({
      orderId,
      planId,
      enteredStudents,
      futureStudents,
      couponCode,
      status: 'created'
    });

    return res.status(201).json({ success: true });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return res.status(500).json({
      message: 'Failed to create payment intent'
    });
  }
};

/* ===============================
   VERIFY RAZORPAY PAYMENT
================================ */
export const verifyPayment = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: 'Missing payment verification fields'
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    // 🔐 Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // 🔐 Ensure intent exists and is not reused
    const intent = await PaymentIntent.findOne({
      orderId: razorpay_order_id
    });

    if (!intent) {
      return res.status(404).json({
        message: 'Payment intent not found'
      });
    }

    if (intent.status === 'paid' || intent.status === 'used') {
      return res.status(200).json({
        success: true,
        orderId: intent.orderId,
        paymentId: intent.paymentId
      });
    }

    // ✅ Mark payment as paid
    intent.paymentId = razorpay_payment_id;
    intent.status = 'paid';
    await intent.save();

    return res.status(200).json({
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      message: 'Payment verification failed'
    });
  }
};
