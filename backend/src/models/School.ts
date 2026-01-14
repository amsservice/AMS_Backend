import { Schema, model, Document, Types } from 'mongoose';

export interface SchoolDoc extends Document {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pincode?: string;

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

    phone: String,
    address: String,
    pincode: String,

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

export const School = model<SchoolDoc>('School', SchoolSchema);
