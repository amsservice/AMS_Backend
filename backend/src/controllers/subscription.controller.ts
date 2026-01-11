




import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { PaymentIntent } from '../models/PaymentIntent';
import { SubscriptionService } from '../services/subscription.service';
import { PLANS } from '../utils/subscriptionPlans';
import { AuthRequest } from '../middleware/auth.middleware';
import { Subscription } from '../models/Subscription';
import {
  pricePreviewSchema,
  createPaymentSchema
} from '../config/zod.schema';

/* ===============================
   RAZORPAY INSTANCE
=============================== */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

/* ===============================
   GET ALL PLANS
=============================== */
export const getPlans = (_req: Request, res: Response) => {
  return res.status(200).json(PLANS);
};

/* ===============================
   PRICE PREVIEW (WITH COUPON)
=============================== */
export const previewPrice = (req: Request, res: Response) => {
  const parsed = pricePreviewSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid input',
      errors: parsed.error.issues
    });
  }

  const result =
    SubscriptionService.calculatePriceWithCoupon(parsed.data);

  return res.status(200).json(result);
};

/* ===============================
   CREATE PAYMENT ORDER (RAZORPAY)
   ⚠️ DOES NOT CREATE SUBSCRIPTION
=============================== */
export const createPayment = async (
  req: Request,
  res: Response
) => {
  const parsed = createPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid payment request',
      errors: parsed.error.issues
    });
  }

  // 🔐 Backend recalculates pricing
  const price =
    SubscriptionService.calculatePriceWithCoupon(parsed.data);

  try {
    // 🔥 CREATE RAZORPAY ORDER
    const order = await razorpay.orders.create({
      amount: price.paidAmount * 100, // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        planId: parsed.data.planId,
        enteredStudents: parsed.data.enteredStudents.toString(),
        couponCode: parsed.data.couponCode || 'NONE'
      }
    });

    return res.status(200).json({
      orderId: order.id,
      amount: price.paidAmount,
      currency: 'INR',

      originalAmount: price.originalAmount,
      discountAmount: price.discountAmount,
      paidAmount: price.paidAmount
    });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    return res.status(500).json({
      message: 'Failed to create payment order'
    });
  }
};



/* ===============================
   RENEW SUBSCRIPTION
================================ */
export const renewSubscription = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      schoolId,
      orderId,
      paymentId
    } = req.body;

    if (!schoolId || !orderId || !paymentId) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    /* 1️⃣ Validate payment */
    const intent = await PaymentIntent.findOne({
      orderId,
      paymentId,
      status: 'paid'
    }).session(session);

    if (!intent) {
      throw new Error('Invalid or unpaid payment');
    }

    /* 2️⃣ Renew subscription */
    const subscription =
      await SubscriptionService.upgradeSubscription(
        {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          planId: intent.planId,
          orderId: intent.orderId,
          paymentId: intent.paymentId!,
          enteredStudents: intent.enteredStudents,
          futureStudents: intent.futureStudents,
          couponCode: intent.couponCode
        },
        session
      );

    /* 3️⃣ Mark payment as used */
    intent.status = 'used';
    await intent.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      subscriptionId: subscription._id
    });

  } catch (error: any) {
    await session.abortTransaction();
    return res.status(400).json({
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

//get billable students

export const getBillableStudents = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({
        message: 'School ID not found in token'
      });
    }

    const subscription = await Subscription.findOne(
      {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        status: { $in: ['active', 'grace'] }
      },
      { billableStudents: 1 }
    );

    if (!subscription) {
      return res.status(404).json({
        message: 'No active subscription found'
      });
    }

    return res.status(200).json({
      billableStudents: subscription.billableStudents
    });

  } catch (error: any) {
    return res.status(500).json({
      message: error.message
    });
  }
};