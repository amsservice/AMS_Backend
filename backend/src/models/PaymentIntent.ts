import { Schema, model, Document } from 'mongoose';
import { Types } from 'mongoose';

export interface PaymentIntentDoc extends Document {
  orderId: string;
  paymentId?: string;

  schoolId?: Types.ObjectId;
  intentMode: 'register' | 'upgrade';

  planId: '1Y' | '2Y' | '3Y';
  enteredStudents: number;
  futureStudents?: number;
  couponCode?: 'FREE_3M' | 'FREE_6M';

  status: 'created' | 'paid' | 'used';
}

const PaymentIntentSchema = new Schema<PaymentIntentDoc>(
  {
    orderId: { type: String, required: true, unique: true },
    paymentId: String,

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      index: true
    },

    intentMode: {
      type: String,
      enum: ['register', 'upgrade'],
      default: 'register'
    },

    planId: { type: String, enum: ['1Y', '2Y', '3Y'], required: true },
    enteredStudents: { type: Number, required: true },
    futureStudents: Number,
    couponCode: { type: String, enum: ['FREE_3M', 'FREE_6M'] },

    status: {
      type: String,
      enum: ['created', 'paid', 'used'],
      default: 'created'
    }
  },
  { timestamps: true }
);

export const PaymentIntent = model<PaymentIntentDoc>(
  'PaymentIntent',
  PaymentIntentSchema
);
