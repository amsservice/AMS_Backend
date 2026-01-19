import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
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
   DOES NOT CREATE SUBSCRIPTION
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

  // Backend recalculates pricing
  const price =
    SubscriptionService.calculatePriceWithCoupon(parsed.data);

  try {
    // CREATE RAZORPAY ORDER
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
   INVOICE HISTORY (PRINCIPAL)
================================ */
export const getInvoiceHistory = async (
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

    const invoices = await Subscription.find(
      { schoolId: new mongoose.Types.ObjectId(schoolId) },
      {
        planId: 1,
        orderId: 1,
        paymentId: 1,
        enteredStudents: 1,
        futureStudents: 1,
        billableStudents: 1,
        originalAmount: 1,
        discountAmount: 1,
        paidAmount: 1,
        couponCode: 1,
        startDate: 1,
        endDate: 1,
        status: 1,
        createdAt: 1
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    const normalized = invoices.map((inv: any) => {
      const plan = inv?.planId ? PLANS[inv.planId as keyof typeof PLANS] : undefined;
      const pricePerStudentPerMonth = plan?.pricePerStudentPerMonth ?? 0;
      const totalMonths = plan?.durationMonths ?? 0;
      const monthlyCost = (inv.billableStudents ?? 0) * pricePerStudentPerMonth;

      return {
        id: String(inv._id),
        planId: inv.planId,
        orderId: inv.orderId,
        paymentId: inv.paymentId,
        enteredStudents: inv.enteredStudents,
        futureStudents: inv.futureStudents ?? 0,
        billableStudents: inv.billableStudents,

        pricePerStudentPerMonth,
        totalMonths,
        monthlyCost,

        originalAmount: inv.originalAmount,
        discountAmount: inv.discountAmount,
        paidAmount: inv.paidAmount,
        couponCode: inv.couponCode,

        startDate: inv.startDate,
        endDate: inv.endDate,
        status: inv.status,
        createdAt: inv.createdAt
      };
    });

    return res.status(200).json({ invoices: normalized });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message
    });
  }
};

/* ===============================
   DOWNLOAD INVOICE PDF
================================ */
export const downloadInvoicePdf = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const schoolId = req.user?.schoolId;
    const invoiceId = req.params.invoiceId;

    if (!schoolId) {
      return res.status(400).json({
        message: 'School ID not found in token'
      });
    }

    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        message: 'Invalid invoice id'
      });
    }

    const inv = await Subscription.findOne(
      {
        _id: new mongoose.Types.ObjectId(invoiceId),
        schoolId: new mongoose.Types.ObjectId(schoolId)
      },
      {
        planId: 1,
        orderId: 1,
        paymentId: 1,
        enteredStudents: 1,
        futureStudents: 1,
        billableStudents: 1,
        originalAmount: 1,
        discountAmount: 1,
        paidAmount: 1,
        couponCode: 1,
        startDate: 1,
        endDate: 1,
        status: 1,
        createdAt: 1
      }
    ).lean();

    if (!inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const plan = inv?.planId
      ? PLANS[inv.planId as keyof typeof PLANS]
      : undefined;
    const pricePerStudentPerMonth = plan?.pricePerStudentPerMonth ?? 0;
    const totalMonths = plan?.durationMonths ?? 0;
    const monthlyCost = (inv.billableStudents ?? 0) * pricePerStudentPerMonth;

    const invoiceDate = inv.createdAt ? new Date(inv.createdAt) : new Date();
    const filename = `invoice_${String(inv.planId)}_${invoiceDate
      .toISOString()
      .slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Header with brand color accent
    doc
      .rect(0, 0, 595, 120)
      .fill('#4F46E5');

    doc
      .fontSize(28)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 40);

    doc
      .fontSize(11)
      .fillColor('#E0E7FF')
      .font('Helvetica')
      .text('Upastithi Subscription Services', 50, 75);

    // Invoice date in header
    doc
      .fontSize(10)
      .fillColor('#FFFFFF')
      .text(`Invoice Date: ${invoiceDate.toLocaleDateString('en-GB')}`, 400, 50, {
        width: 145,
        align: 'right'
      });

    // Status badge
    const statusColor = inv.status === 'active' ? '#10B981' : '#F59E0B';
    const statusLabel = inv.status === 'queued' ? 'UPCOMING' : String(inv.status).toUpperCase();
    doc
      .rect(400, 75, 145, 22)
      .fill(statusColor);
    
    doc
      .fontSize(10)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text(statusLabel, 400, 80, {
        width: 145,
        align: 'center'
      });

    doc.font('Helvetica');

    // Invoice details section
    doc.moveDown(4);
    const detailsY = 150;

    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text('INVOICE DETAILS', 50, detailsY);

    doc
      .moveTo(50, detailsY + 15)
      .lineTo(545, detailsY + 15)
      .strokeColor('#4F46E5')
      .lineWidth(2)
      .stroke();

    const detailsStartY = detailsY + 30;
    doc.fontSize(10).fillColor('#374151');

    const detailsData = [
      ['Plan:', String(inv.planId)],
      ['Order ID:', String(inv.orderId)],
      ['Payment ID:', String(inv.paymentId)]
    ];

    detailsData.forEach((item, idx) => {
      const y = detailsStartY + idx * 20;
      doc.fillColor('#6B7280').text(item[0], 50, y, { width: 120 });
      doc.fillColor('#111827').font('Helvetica-Bold').text(item[1], 170, y, { width: 375 });
      doc.font('Helvetica');
    });

    // Subscription breakdown section
    const breakdownY = detailsStartY + 80;

    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text('SUBSCRIPTION BREAKDOWN', 50, breakdownY);

    doc
      .moveTo(50, breakdownY + 15)
      .lineTo(545, breakdownY + 15)
      .strokeColor('#4F46E5')
      .lineWidth(2)
      .stroke();

    // Table header
    const tableStartY = breakdownY + 35;
    doc
      .rect(50, tableStartY, 495, 25)
      .fill('#F9FAFB');

    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .font('Helvetica-Bold')
      .text('DESCRIPTION', 60, tableStartY + 8)
      .text('VALUE', 450, tableStartY + 8, { width: 85, align: 'right' });

    doc.font('Helvetica');

    // Table rows
    const tableRows = [
      ['Entered Students', String(inv.enteredStudents)],
      ['Future Students', String(inv.futureStudents ?? 0)],
      ['Billable Students', String(inv.billableStudents)],
      ['Price / Student / Month', `Rs. ${pricePerStudentPerMonth}`],
      ['Total Months', String(totalMonths)],
      ['Monthly Cost', `Rs. ${monthlyCost}`]
    ];

    let currentY = tableStartY + 25;

    tableRows.forEach((row, idx) => {
      // Alternate row background
      if (idx % 2 === 0) {
        doc.rect(50, currentY, 495, 22).fill('#FFFFFF');
      } else {
        doc.rect(50, currentY, 495, 22).fill('#F9FAFB');
      }

      doc
        .fontSize(10)
        .fillColor('#374151')
        .text(row[0], 60, currentY + 6, { width: 360 });
      
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(row[1], 450, currentY + 6, { width: 85, align: 'right' });
      
      doc.font('Helvetica');

      currentY += 22;
    });

    // Subscription period
    currentY += 10;
    doc
      .fontSize(9)
      .fillColor('#6B7280')
      .text('Subscription Period:', 60, currentY);
    
    doc
      .fontSize(10)
      .fillColor('#111827')
      .text(
        `${inv.startDate ? new Date(inv.startDate).toLocaleDateString('en-GB') : '-'} to ${inv.endDate ? new Date(inv.endDate).toLocaleDateString('en-GB') : '-'}`,
        60,
        currentY + 15
      );

    // Payment summary section
    const summaryY = currentY + 60;

    doc
      .rect(320, summaryY, 225, 100)
      .fillAndStroke('#F9FAFB', '#E5E7EB')
      .lineWidth(1);

    const summaryItems = [
      ['Original Amount', `Rs. ${inv.originalAmount}`],
      ['Discount', `- Rs. ${inv.discountAmount}`],
      ['Coupon', String(inv.couponCode ?? '-')]
    ];

    let summaryItemY = summaryY + 15;

    summaryItems.forEach((item) => {
      doc
        .fontSize(10)
        .fillColor('#6B7280')
        .text(item[0], 330, summaryItemY, { width: 120 });
      
      doc
        .fillColor('#374151')
        .text(item[1], 450, summaryItemY, { width: 85, align: 'right' });
      
      summaryItemY += 20;
    });

    // Total amount paid
    doc
      .rect(320, summaryY + 75, 225, 25)
      .fill('#4F46E5');

    doc
      .fontSize(11)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .text('Amount Paid', 330, summaryY + 82);
    
    doc
      .fontSize(12)
      .text(`Rs. ${inv.paidAmount}`, 450, summaryY + 82, { width: 85, align: 'right' });

    // Footer
    doc
      .moveTo(50, 750)
      .lineTo(545, 750)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(8)
      .fillColor('#9CA3AF')
      .font('Helvetica')
      .text('This is a system generated invoice and does not require signature.', 50, 760, {
        align: 'center',
        width: 495
      });

    doc.end();
  } catch (error: any) {
    return res.status(500).json({
      message: error.message
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