import { Schema, model, Types, Document } from 'mongoose';

export type HolidayCategory = 'NATIONAL' | 'FESTIVAL' | 'SCHOOL';

export interface IHoliday extends Document {
  name: string;
  date: Date;
  description?: string;
  category: HolidayCategory;
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: Date,
      required: true
    },

    description: {
      type: String
    },

    category: {
      type: String,
      enum: ['NATIONAL', 'FESTIVAL', 'SCHOOL'],
      required: true,
      default: 'SCHOOL'
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true
    },

    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true
    }
  },
  { timestamps: true }
);

/* Prevent duplicate holidays per date per session */
holidaySchema.index(
  { schoolId: 1, sessionId: 1, date: 1 },
  { unique: true }
);

export const Holiday = model<IHoliday>('Holiday', holidaySchema);
