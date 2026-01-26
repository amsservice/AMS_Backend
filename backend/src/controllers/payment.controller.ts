import { Request, Response } from "express";
import crypto from "crypto";
import { PaymentIntent } from "../models/PaymentIntent";
import { AuthService } from "../services/auth.service";
import { School } from "../models/School";
import { Principal } from "../models/Principal";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  JwtPayload,
} from "../utils/jwt";
import { AuthRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";
import { Subscription } from "../models/Subscription";
import { Student } from "../models/Student";
import { SubscriptionService } from "../services/subscription.service";

/* ===============================
   CREATE PAYMENT INTENT
================================ */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { orderId, planId, enteredStudents, futureStudents, couponCode } =
      req.body;

    if (!orderId || !planId || !enteredStudents) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const exists = await PaymentIntent.findOne({ orderId });
    if (exists) {
      return res.status(200).json({
        success: true,
        message: "Payment intent already exists",
      });
    }

    await PaymentIntent.create({
      orderId,
      planId,
      enteredStudents,
      futureStudents,
      couponCode,
      status: "created",
    });

    return res.status(201).json({
      success: true,
      message: "Payment intent created",
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    return res.status(500).json({
      message: "Failed to create payment intent",
    });
  }
};

/* ===============================
   CREATE UPGRADE PAYMENT INTENT
================================ */
export const createUpgradePaymentIntent = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { orderId, planId, enteredStudents, futureStudents, couponCode } =
      req.body;

    if (!orderId || !planId || !enteredStudents) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await PaymentIntent.findOne({ orderId });
    if (exists) {
      return res.status(200).json({
        success: true,
        message: "Payment intent already exists",
      });
    }

    await PaymentIntent.create({
      orderId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      intentMode: "upgrade",
      planId,
      enteredStudents,
      futureStudents,
      couponCode,
      status: "created",
    });

    return res.status(201).json({
      success: true,
      message: "Upgrade payment intent created",
    });
  } catch (error) {
    console.error("Create upgrade payment intent error:", error);
    return res.status(500).json({
      message: "Failed to create upgrade payment intent",
    });
  }
};

/* ===============================
   VERIFY UPGRADE PAYMENT & RENEW SUBSCRIPTION
================================ */
export const verifyUpgradePayment = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ message: "Missing payment verification fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature),
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const intent = await PaymentIntent.findOne({
      orderId: razorpay_order_id,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      intentMode: "upgrade",
    });

    if (!intent) {
      return res.status(404).json({ message: "Payment intent not found" });
    }

    if (intent.status === "used") {
      return res.status(200).json({
        success: true,
        message: "Upgrade already applied",
      });
    }

    if (intent.status !== "paid") {
      intent.paymentId = razorpay_payment_id;
      intent.status = "paid";
      await intent.save();
    }

    const baselineSub = await Subscription.findOne(
      {
        schoolId: new mongoose.Types.ObjectId(schoolId),
      },
      { billableStudents: 1, status: 1, endDate: 1, startDate: 1 },
    ).sort({ endDate: -1 });

    if (!baselineSub) {
      return res.status(400).json({ message: "No subscription history found" });
    }

    const maxNonExpired = await Subscription.findOne(
      {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        status: { $in: ["active", "grace", "queued"] },
      },
      { billableStudents: 1 },
    ).sort({ billableStudents: -1 });

    const minCapacity =
      maxNonExpired?.billableStudents ?? baselineSub.billableStudents ?? 0;

    const activeStudents = await Student.countDocuments({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      status: "active",
    });

    const requestedBillable =
      (intent.enteredStudents || 0) + (intent.futureStudents || 0);

    if (requestedBillable < activeStudents) {
      return res.status(400).json({
        message: `Billable students cannot be less than current active students (${activeStudents})`,
      });
    }

    if (requestedBillable < minCapacity) {
      return res.status(400).json({
        message: `Billable students cannot be less than your current subscription capacity (${minCapacity})`,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscription = await SubscriptionService.upgradeSubscription(
        {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          planId: intent.planId,
          orderId: intent.orderId,
          paymentId: intent.paymentId!,
          enteredStudents: intent.enteredStudents,
          futureStudents: intent.futureStudents,
          couponCode: intent.couponCode,
        },
        session,
      );

      const school = await School.findById(
        new mongoose.Types.ObjectId(schoolId),
      ).session(session);

      if (!school) {
        throw new Error("School not found");
      }

      // If the new subscription is queued, keep school.subscriptionId pointing to the current active plan.
      if (subscription.status === "active") {
        school.subscriptionId = subscription._id;
      }
      school.paymentId = intent.paymentId;
      await school.save({ session });

      intent.status = "used";
      await intent.save({ session });

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Subscription upgraded successfully",
      });
    } catch (e: any) {
      await session.abortTransaction();
      return res.status(400).json({ message: e?.message || "Upgrade failed" });
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Upgrade payment verification error:", error);
    return res.status(500).json({
      message: "Payment verification failed",
    });
  }
};

/* ===============================
   VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
================================ */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      schoolEmail,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !schoolEmail
    ) {
      return res.status(400).json({
        message: "Missing payment verification fields",
      });
    }
    /* ✅ DECLARE FIRST (FIX) */
    // const normalizedEmail = schoolEmail.toLowerCase().trim();

    /* ===============================
       VERIFY RAZORPAY SIGNATURE
    ================================ */
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature),
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    /* ===============================
       FETCH PAYMENT INTENT
    ================================ */
    const intent = await PaymentIntent.findOne({
      orderId: razorpay_order_id,
    });

    if (!intent) {
      return res.status(404).json({
        message: "Payment intent not found",
      });
    }

    // ✅ If already fully processed
    if (intent.status === "used") {
      return res.status(200).json({
        success: true,
        message: "Subscription already activated",
      });
    }

    // ✅ Mark as paid (idempotent)
    if (intent.status !== "paid") {
      intent.paymentId = razorpay_payment_id;
      intent.status = "paid";
      await intent.save();
    }

    /* ===============================
       ACTIVATE SUBSCRIPTION (CORE FLOW)
    ================================ */

    const normalizedEmail = schoolEmail.toLowerCase().trim();

    await AuthService.activateSubscription({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      schoolEmail: normalizedEmail,
    });

    /* ===============================
        AUTO LOGIN PRINCIPAL
     ================================ */
    const school = await School.findOne({ email: normalizedEmail });

    if (!school || !school.principalId) {
      return res.status(500).json({
        message: "Principal not found for school",
      });
    }

    const principal = await Principal.findById(school.principalId);

    if (!principal) {
      return res.status(500).json({
        message: "Principal account missing",
      });
    }

    const payload: JwtPayload = {
      userId: principal._id.toString(),
      role: "principal",
      schoolId: school._id.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      user: {
        id: principal._id.toString(),
        name: principal.name,
        email: principal.email,
        role: "principal",
      },
      message: "Payment verified & subscription activated",
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      message: "Payment verification failed",
    });
  }
};
