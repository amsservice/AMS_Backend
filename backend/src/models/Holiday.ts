import { Schema, model, Types, Document } from 'mongoose';

export type HolidayCategory = 'NATIONAL' | 'FESTIVAL' | 'SCHOOL';

export interface IHoliday extends Document {
  name: string;
  startDate: Date;
  endDate?: Date;
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

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      validate: {
        validator: function (this: IHoliday, value: Date) {
          if (!value) return true;
          const ctx: any = this as any;
          const directStart: Date | undefined = ctx.startDate;
          const updateObj: any = typeof ctx.getUpdate === 'function' ? ctx.getUpdate() : undefined;
          const updateStart: Date | undefined =
            updateObj?.startDate ??
            updateObj?.$set?.startDate;

          const start = directStart ?? updateStart;
          if (!start) return true;
          return value >= start;
        },
        message: 'End date must be greater than or equal to start date'
      }
    },

    description: String,

    category: {
      type: String,
      enum: ['NATIONAL', 'FESTIVAL', 'SCHOOL'],
      default: 'SCHOOL',
      required: true
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

export const Holiday = model<IHoliday>('Holiday', holidaySchema);
