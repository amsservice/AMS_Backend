



import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface TeacherSessionHistory {
  sessionId: Types.ObjectId;
  classId: Types.ObjectId;
  className: string;
  section: string;
  isActive: boolean;
}

export interface TeacherDoc extends Document {
  name: string;
  email: string;
  password: string;
  schoolId: Types.ObjectId;
  phone: string;
  dob: Date;
  gender: 'male' | 'female' | 'other';
  highestQualification?: string;
  experienceYears?: number;
  address?: string;
  isActive: boolean;
  leftAt?: Date;
  history: TeacherSessionHistory[];

  // ✅ ADD THIS (IMPORTANT)
  comparePassword(candidate: string): Promise<boolean>;
}

const TeacherSessionSchema = new Schema<TeacherSessionHistory>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    isActive: { type: Boolean, default: false }
  },
  { _id: false }
);

const TeacherSchema = new Schema<TeacherDoc>(
  {
    name: { type: String, required: true },

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
      select: false
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, 'Phone must be exactly 10 digits']
    },

    dob: {
      type: Date,
      required: true
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },

    highestQualification: {
      type: String,
      trim: true,
      maxlength: 100
    },

    experienceYears: {
      type: Number,
      min: 0,
      max: 42
    },

    address: {
      type: String,
      trim: true,
      maxlength: 250
    },

    isActive: {
      type: Boolean,
      default: true
    },

    leftAt: {
      type: Date
    },

    history: {
      type: [TeacherSessionSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* ======================================================
   VIRTUAL: CURRENT CLASS
====================================================== */
TeacherSchema.virtual('currentClass').get(function () {
  return this.history.find(h => h.isActive);
});

/* ======================================================
   PASSWORD HASHING
====================================================== */
TeacherSchema.pre('save', async function () {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 10);
  
});

// TeacherSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

/* ======================================================
   PASSWORD COMPARISON  ✅ ADD THIS
====================================================== */
TeacherSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const Teacher = model<TeacherDoc>('Teacher', TeacherSchema);
