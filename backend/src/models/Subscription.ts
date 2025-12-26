
import { Schema, model, Types, Document } from 'mongoose';

export interface SubscriptionDoc extends Document {
  schoolId: Types.ObjectId;

  planId: '1Y' | '2Y' | '3Y';

  orderId: string;        // ✅ Razorpay order id
  paymentId: string;     // ✅ Razorpay payment id

  enteredStudents: number;
 
  futureStudents?: number;
  billableStudents: number;

  originalAmount: number;
  discountAmount: number;
  paidAmount: number;

  couponCode?: 'FREE_3M' | 'FREE_6M';

  startDate: Date;
  endDate: Date;

  gracePeriodDays: number;
  graceEndDate: Date;

  status: 'active' | 'grace' | 'expired';

  previousSubscriptionId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<SubscriptionDoc>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    planId: {
      type: String,
      enum: ['1Y', '2Y', '3Y'],
      required: true
    },

    orderId: {
      type: String,
      required: true,
      index: true,
      unique: true
    },

    paymentId: {
      type: String,
      required: true
    },

    enteredStudents: { type: Number, required: true },
   
    futureStudents: Number,
    billableStudents: { type: Number, required: true },

    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true },

    couponCode: {
      type: String,
      enum: ['FREE_3M', 'FREE_6M']
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    gracePeriodDays: { type: Number, default: 7 },
    graceEndDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['active', 'grace', 'expired'],
      default: 'active'
    },

    previousSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription'
    }
  },
  { timestamps: true }
);

/*
  Only ONE active/grace subscription per school
*/
SubscriptionSchema.index(
  { schoolId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['active', 'grace'] }
    }
  }
);

export const Subscription = model<SubscriptionDoc>(
  'Subscription',
  SubscriptionSchema
);
