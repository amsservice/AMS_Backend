import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface PrincipalDoc extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  // 🆕 NEW FIELDS
  gender?: 'Male' | 'Female' | 'Other';
  yearsOfExperience?: number;
  schoolId: Types.ObjectId;

  comparePassword(candidate: string): Promise<boolean>;
}

const PrincipalSchema = new Schema<PrincipalDoc>(
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

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    phone: String,

     // 🆕 Gender (Optional)
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },

    // 🆕 Years of Experience (Optional)
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 60
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

 
  // Password Hashing (FIXED)

PrincipalSchema.pre('save', async function () {
 
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

 
  // Password Comparison

PrincipalSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const Principal = model<PrincipalDoc>('Principal', PrincipalSchema);
