
import mongoose, { Types } from 'mongoose';
import { PLANS, PlanId } from '../utils/subscriptionPlans';
import { COUPONS, CouponCode } from '../utils/coupons';
import { Subscription } from '../models/Subscription';

/* ===============================
   Helpers
================================ */
const addMonths = (date: Date, months: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export class SubscriptionService {
  /* ===============================
     BASE PRICE CALCULATION
  =============================== */
  static calculatePrice({
    planId,
    enteredStudents,
    futureStudents = 0
  }: {
    planId: PlanId;
    enteredStudents: number;
    futureStudents?: number;
  }) {
    const plan = PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    if (enteredStudents <= 0) {
      throw new Error('Entered students must be greater than 0');
    }

    if (futureStudents < 0) {
      throw new Error('Future students cannot be negative');
    }

    const billableStudents = enteredStudents + futureStudents;

    const monthlyCost =
      billableStudents * plan.pricePerStudentPerMonth;

    const originalAmount =
      monthlyCost * plan.durationMonths;

    return {
      planId,
      enteredStudents,
      futureStudents,
      billableStudents,
      pricePerStudentPerMonth: plan.pricePerStudentPerMonth,
      totalMonths: plan.durationMonths,
      monthlyCost,
      originalAmount
    };
  }

  /* ===============================
     PRICE WITH COUPON (DISCOUNT)
  =============================== */
  static calculatePriceWithCoupon({
    planId,
    enteredStudents,
    futureStudents = 0,
    couponCode
  }: {
    planId: PlanId;
    enteredStudents: number;
    futureStudents?: number;
    couponCode?: CouponCode;
  }) {
    const base = this.calculatePrice({
      planId,
      enteredStudents,
      futureStudents
    });

    let discountMonths = 0;
    let discountAmount = 0;

    if (couponCode) {
      const coupon = COUPONS[couponCode];
      if (!coupon) throw new Error('Invalid coupon code');

      discountMonths = coupon.discountMonths;
      discountAmount =
        base.monthlyCost * discountMonths;
    }

    const paidAmount = base.originalAmount - discountAmount;

    if (paidAmount < 0) {
      throw new Error('Invalid discount calculation');
    }

    return {
      ...base,
      discountMonths,
      discountAmount,
      paidAmount
    };
  }

  /* ===============================
     CREATE SUBSCRIPTION (TX SAFE)
  =============================== */
  static async createSubscription(
    data: {
      schoolId: Types.ObjectId;
      planId: PlanId;
      orderId: string;
      paymentId: string;
      enteredStudents: number;
      futureStudents?: number;
      couponCode?: CouponCode;
    },
    session: mongoose.ClientSession
  ) {
    // 🔐 Idempotency protection
    const exists = await Subscription.findOne(
      {
        $or: [
          { paymentId: data.paymentId },
          { orderId: data.orderId }
        ]
      },
      null,
      { session }
    );

    if (exists) {
      throw new Error('Payment already used');
    }

    const price = this.calculatePriceWithCoupon(data);

    const startDate = new Date();
    const endDate = addMonths(startDate, price.totalMonths);
    const gracePeriodDays = 7;
    const graceEndDate = addDays(endDate, gracePeriodDays);

    const [subscription] = await Subscription.create(
      [
        {
          schoolId: data.schoolId,
          planId: data.planId,
          orderId: data.orderId,
          paymentId: data.paymentId,

          enteredStudents: price.enteredStudents,
          futureStudents: data.futureStudents,
          billableStudents: price.billableStudents,

          originalAmount: price.originalAmount,
          discountAmount: price.discountAmount,
          paidAmount: price.paidAmount,
          couponCode: data.couponCode,

          startDate,
          endDate,
          gracePeriodDays,
          graceEndDate,
          status: 'active'
        }
      ],
      { session }
    );

    return subscription;
  }

  /* ===============================
     RENEW / UPGRADE
  =============================== */
  static async upgradeSubscription(
    data: {
      schoolId: Types.ObjectId;
      planId: PlanId;
      orderId: string;
      paymentId: string;
      enteredStudents: number;
      futureStudents?: number;
      couponCode?: CouponCode;
    },
    session: mongoose.ClientSession
  ) {
    const current = await Subscription.findOne(
      {
        schoolId: data.schoolId,
        status: { $in: ['active', 'grace'] }
      },
      null,
      { session }
    );

    if (!current) {
      throw new Error('No active subscription found');
    }

    current.status = 'expired';
    await current.save({ session });

    return this.createSubscription(data, session);
  }

  /* ===============================
     UTIL
  =============================== */
  static async findByPaymentId(paymentId: string) {
    return Subscription.findOne({ paymentId });
  }
}
