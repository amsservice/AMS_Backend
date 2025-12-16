import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

/* ===============================
   Session History Interface
================================ */
export interface StudentSessionHistory {
  sessionId: Types.ObjectId;
  classId: Types.ObjectId;
  section: string;
  rollNo: number;
  isActive: boolean;
}

/* ===============================
   Student Document Interface
================================ */
export interface StudentDoc extends Document {
  name: string;
  email: string;
  password: string;

  admissionNo: string;

  fatherName: string;
  motherName: string;
  parentsPhone: string;

  schoolId: Types.ObjectId;

  status: 'active' | 'inactive' | 'left';

  history: StudentSessionHistory[];

  comparePassword(candidate: string): Promise<boolean>;
}

/* ===============================
   Session History Schema
================================ */
const StudentSessionSchema = new Schema<StudentSessionHistory>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    section: {
      type: String,
      required: true
    },
    rollNo: {
      type: Number,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

/* ===============================
   Student Schema
================================ */
const StudentSchema = new Schema<StudentDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    admissionNo: {
      type: String,
      required: true
    },

    fatherName: {
      type: String,
      required: true
    },

    motherName: {
      type: String,
      required: true
    },

    parentsPhone: {
      type: String,
      required: true
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active'
    },

    history: {
      type: [StudentSessionSchema],
      default: []
    }
  },
  { timestamps: true }
);

/* ===============================
   Indexes (CRITICAL)
================================ */

// unique admission number per school
StudentSchema.index(
  { schoolId: 1, admissionNo: 1 },
  { unique: true }
);

// unique email per school 
StudentSchema.index(
  { schoolId: 1, email: 1 },
  { unique: true }
);

/* ===============================
   Password Hashing
================================ */
StudentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

/* ===============================
   Password Compare
================================ */
StudentSchema.methods.comparePassword = function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const Student = model<StudentDoc>('Student', StudentSchema);
