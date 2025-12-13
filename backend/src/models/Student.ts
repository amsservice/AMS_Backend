import { Schema, model, Document, Types } from 'mongoose';

export interface StudentDoc extends Document {
  name: string;
  rollNo: number;
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
}

const StudentSchema = new Schema<StudentDoc>(
  {
    name: { type: String, required: true },

    rollNo: { type: Number, required: true },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// unique roll number per class
StudentSchema.index({ classId: 1, rollNo: 1 }, { unique: true });

export const Student = model<StudentDoc>('Student', StudentSchema);
