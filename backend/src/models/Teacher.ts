import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface TeacherSessionHistory {
  sessionId: Types.ObjectId;
  classId: Types.ObjectId;
  section: string;
  // subject: string;
  isActive: boolean;
}

export interface TeacherDoc extends Document {
  name: string;
  email: string;
  password: string;
  schoolId: Types.ObjectId;

  currentSession?: TeacherSessionHistory;
  history: TeacherSessionHistory[];
}

const TeacherSessionSchema = new Schema<TeacherSessionHistory>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: String, required: true },
    // subject: { type: String, required: true },
    isActive: { type: Boolean, default: false }
  },
  { _id: false }
);

const TeacherSchema = new Schema<TeacherDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },

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

TeacherSchema.virtual('currentClass').get(function () {
  return this.history.find(h => h.isActive);
});

/* ===============================
   Password Hashing
================================ */
TeacherSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export const Teacher = model<TeacherDoc>('Teacher', TeacherSchema);