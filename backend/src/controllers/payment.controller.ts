
import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentIntent } from '../models/PaymentIntent';
import { AuthService } from '../services/auth.service';
import { School } from '../models/School';
import { Principal } from '../models/Principal';
import { signAccessToken } from '../utils/jwt';

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

    if (!orderId || !planId || !enteredStudents) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    // 🔐 Prevent duplicate intent
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

    return res.status(201).json({
      success: true,
      message: 'Payment intent created'
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return res.status(500).json({
      message: 'Failed to create payment intent'
    });
  }
};

/* ===============================
   VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
================================ */
export const verifyPayment = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      schoolEmail
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !schoolEmail
    ) {
      return res.status(400).json({
        message: 'Missing payment verification fields'
      });
    }
    /* ✅ DECLARE FIRST (FIX) */
    // const normalizedEmail = schoolEmail.toLowerCase().trim();

    /* ===============================
       VERIFY RAZORPAY SIGNATURE
    ================================ */
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

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

    /* ===============================
       FETCH PAYMENT INTENT
    ================================ */
    const intent = await PaymentIntent.findOne({
      orderId: razorpay_order_id
    });

    if (!intent) {
      return res.status(404).json({
        message: 'Payment intent not found'
      });
    }

    // ✅ If already fully processed
    if (intent.status === 'used') {
      return res.status(200).json({
        success: true,
        message: 'Subscription already activated'
      });
    }

    // ✅ Mark as paid (idempotent)
    if (intent.status !== 'paid') {
      intent.paymentId = razorpay_payment_id;
      intent.status = 'paid';
      await intent.save();
    }

    /* ===============================
       ACTIVATE SUBSCRIPTION (CORE FLOW)
    ================================ */

    const normalizedEmail = schoolEmail.toLowerCase().trim();

    await AuthService.activateSubscription({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      schoolEmail: normalizedEmail
    });

    //   return res.status(200).json({
    //     success: true,
    //     message: 'Payment verified & subscription activated'
    //   });

    // } catch (error) {
    //   console.error('Payment verification error:', error);
    //   return res.status(500).json({
    //     message: 'Payment verification failed'
    //   });
    // }

    /* ===============================
        AUTO LOGIN PRINCIPAL
     ================================ */
    const school = await School.findOne({ email: normalizedEmail });

    if (!school || !school.principalId) {
      return res.status(500).json({
        message: 'Principal not found for school'
      });
    }

    const principal = await Principal.findById(school.principalId);

    if (!principal) {
      return res.status(500).json({
        message: 'Principal account missing'
      });
    }

    const accessToken = signAccessToken({
      userId: principal._id.toString(),
      role: 'principal',
      schoolId: school._id.toString()
    });

    return res.status(200).json({
      success: true,
      accessToken,
      message: 'Payment verified & subscription activated'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      message: 'Payment verification failed'
    });
  }
};