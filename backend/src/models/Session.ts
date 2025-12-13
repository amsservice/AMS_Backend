import { Schema, model, Document, Types } from 'mongoose';

export interface SessionDoc extends Document {
  name: string;            // "2024-25"
  startDate: Date;
  endDate: Date;
  schoolId: Types.ObjectId;
  isActive: boolean;
}

const SessionSchema = new Schema<SessionDoc>(
  {
    name: { type: String, required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// one active session per school
SessionSchema.index({ schoolId: 1, isActive: 1 });

export const Session = model<SessionDoc>('Session', SessionSchema);
