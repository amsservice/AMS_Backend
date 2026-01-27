import { Schema, model, Document, Types } from 'mongoose';

export interface ClassDoc extends Document {
  name: string;        // "10"
  section: string;     // "A"
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
  teacherId?: Types.ObjectId;
}

const ClassSchema = new Schema<ClassDoc>(
  {
    name: { type: String, required: true },
    section: { type: String, required: true },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true
    },

    teacherId: { type: Schema.Types.ObjectId, ref: 'Staff' }
  },
  { timestamps: true }
);

// unique class per session
ClassSchema.index({ schoolId: 1, sessionId: 1, name: 1, section: 1 }, { unique: true });

export const Class = model<ClassDoc>('Class', ClassSchema);
