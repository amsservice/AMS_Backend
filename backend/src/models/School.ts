import { Schema, model, Document, Types } from 'mongoose';
import { Counter } from './Counter';

export interface SchoolDoc extends Document {
  schoolCode: number; //school code eg 1001
  name: string;
  email: string;
  phone?: string;
  schoolType: 'Government' | 'Private' | 'Semi-Private';
  board: string;
  address?: string;
  pincode?: string;


  city: string;
  district: string;
  state: string;

  principalId?: Types.ObjectId;      // admin user
  subscriptionId?: Types.ObjectId;   // plaan

  // 🔐 EMAIL VERIFICATION
  isEmailVerified: boolean;
  emailOtp?: string;
  otpExpires?: Date;
  otpResendCount?: number;
  lastOtpSentAt?: Date;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<SchoolDoc>(
  {
    // 🔢 AUTO GENERATED SCHOOL CODE
    schoolCode: {
      type: Number,
      unique: true,
      index: true,
      immutable: true // cannot be updated
    },
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    schoolType: {
      type: String,
      enum: ['Government', 'Private', 'Semi-Private'],
      required: true
    },

    board: {
      type: String,
      required: true,
      trim: true
    },

    phone: String,
    address: String,
    pincode: String,
    city: {
      type: String,
      required: true,
      trim: true
    },

    district: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },


    principalId: {
      type: Schema.Types.ObjectId,
      ref: 'Principal'
    },

    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription'
    },

    // ✅ NEW FIELDS
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    emailOtp: String,
    otpExpires: Date,

    isActive: {
      type: Boolean,
      default: true
    },
    otpResendCount: {
      type: Number,
      default: 0
    },

    lastOtpSentAt: Date,

  },
  { timestamps: true }
);


/* ================================
   AUTO-INCREMENT SCHOOL CODE
================================ */
SchoolSchema.pre('save', async function () {
  if (!this.isNew) return;

  const counter = await Counter.findOneAndUpdate(
    { name: 'schoolCode' },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!counter) {
    throw new Error('School code counter not initialized');
  }

  this.schoolCode = counter.seq; // ✅ 1001, 1002, 1003...
});


export const School = model<SchoolDoc>('School', SchoolSchema);
