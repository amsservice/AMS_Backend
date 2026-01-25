
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
  static async transitionForSchool(schoolId: Types.ObjectId) {
    const now = new Date();

    const activeOrGrace = await Subscription.findOne({
      schoolId,
      status: { $in: ['active', 'grace'] }
    }).sort({ startDate: -1 });

    if (activeOrGrace) {
      if (activeOrGrace.status === 'active') {
        if (activeOrGrace.endDate.getTime() <= now.getTime()) {
          if (activeOrGrace.graceEndDate.getTime() > now.getTime()) {
            activeOrGrace.status = 'grace';
            await activeOrGrace.save();
          } else {
            activeOrGrace.status = 'expired';
            await activeOrGrace.save();
          }
        }
      }

      if (activeOrGrace.status === 'grace') {
        if (activeOrGrace.graceEndDate.getTime() <= now.getTime()) {
          activeOrGrace.status = 'expired';
          await activeOrGrace.save();
        }
      }
    }

    const hasActiveOrGrace = await Subscription.exists({
      schoolId,
      status: { $in: ['active', 'grace'] }
    });

    if (!hasActiveOrGrace) {
      const nextQueued = await Subscription.findOne({
        schoolId,
        status: 'queued',
        startDate: { $lte: now }
      }).sort({ startDate: 1 });

      if (nextQueued) {
        nextQueued.status = 'active';
        await nextQueued.save();
      }
    }
  }

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
    if (planId === '6M' && couponCode === 'FREE_6M') {
      const plan = PLANS[planId];
      if (!plan) throw new Error('Invalid plan');

      if (enteredStudents <= 0) {
        throw new Error('Entered students must be greater than 0');
      }

      if (futureStudents < 0) {
        throw new Error('Future students cannot be negative');
      }

      const billableStudents = enteredStudents + futureStudents;
      const paidAmount = 1;

      return {
        planId,
        enteredStudents,
        futureStudents,
        billableStudents,
        pricePerStudentPerMonth: plan.pricePerStudentPerMonth,
        totalMonths: plan.durationMonths,
        monthlyCost: 0,
        originalAmount: paidAmount,
        discountMonths: 0,
        discountAmount: 0,
        paidAmount
      };
    }

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
      startDate?: Date;
      carryOverMs?: number;
      status?: 'active' | 'grace' | 'queued' | 'expired';
      previousSubscriptionId?: Types.ObjectId;
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

    const startDate = data.startDate ?? new Date();
    const endDateBase = addMonths(startDate, price.totalMonths);
    const carryOverMs = typeof data.carryOverMs === 'number' ? data.carryOverMs : 0;
    const endDate = carryOverMs > 0 ? new Date(endDateBase.getTime() + carryOverMs) : endDateBase;
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

          status: data.status ?? 'active',
          previousSubscriptionId: data.previousSubscriptionId
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
    const now = new Date();

    const lastNonExpired = await Subscription.findOne(
      {
        schoolId: data.schoolId,
        status: { $in: ['active', 'grace', 'queued'] }
      },
      null,
      { session }
    ).sort({ endDate: -1 });

    if (lastNonExpired) {
      return this.createSubscription(
        {
          ...data,
          startDate: lastNonExpired.endDate,
          carryOverMs: 0,
          status: 'queued',
          previousSubscriptionId: lastNonExpired._id
        },
        session
      );
    }

    const last = await Subscription.findOne(
      { schoolId: data.schoolId },
      null,
      { session }
    ).sort({ createdAt: -1 });

    if (!last) {
      throw new Error('No subscription history found');
    }

    // No active/grace/queued. Start immediately.
    return this.createSubscription(
      {
        ...data,
        startDate: now,
        carryOverMs: 0,
        status: 'active',
        previousSubscriptionId: last._id
      },
      session
    );
  }

  /* ===============================
     UTIL
  =============================== */
  static async findByPaymentId(paymentId: string) {
    return Subscription.findOne({ paymentId });
  }

//get total number for billable students

  static async getBillableStudents(schoolId: Types.ObjectId) {
    const subscription = await Subscription.findOne(
      {
        schoolId,
        status: { $in: ['active', 'grace'] }
      },
      { billableStudents: 1 }
    );

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    return subscription.billableStudents;
  }
}
