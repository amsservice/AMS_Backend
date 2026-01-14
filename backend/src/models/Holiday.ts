// import { Schema, model, Types, Document } from 'mongoose';

// export type HolidayCategory = 'NATIONAL' | 'FESTIVAL' | 'SCHOOL';

// export interface IHoliday extends Document {
//   name: string;
//  startDate: Date;
//   endDate?: Date;
//   description?: string;
//   category: HolidayCategory;
//   schoolId: Types.ObjectId;
//   sessionId: Types.ObjectId;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const holidaySchema = new Schema<IHoliday>(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true
//     },

//     startDate: {
//       type: Date,
//       required: true
//     },

//     endDate: {
//       type: Date,
//       validate: {
//         validator: function (this: IHoliday, value: Date) {
//           if (!value) return true;
//           return value >= this.startDate;
//         },
//         message: 'End date must be greater than or equal to start date'
//       }
//     },


//     description: {
//       type: String
//     },

//     category: {
//       type: String,
//       enum: ['NATIONAL', 'FESTIVAL', 'SCHOOL'],
//       required: true,
//       default: 'SCHOOL'
//     },

//     schoolId: {
//       type: Schema.Types.ObjectId,
//       ref: 'School',
//       required: true
//     },

//     sessionId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Session',
//       required: true
//     }
//   },
//   { timestamps: true }
// );

// /* Prevent duplicate holidays per date per session */
// holidaySchema.index(
//   { schoolId: 1, sessionId: 1, startDate: 1 },
//   { unique: true }
// );

// export const Holiday = model<IHoliday>('Holiday', holidaySchema);



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
          return value >= this.startDate;
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

/* Prevent same startDate duplicate */
holidaySchema.index(
  { schoolId: 1, sessionId: 1, startDate: 1 },
  { unique: true }
);

export const Holiday = model<IHoliday>('Holiday', holidaySchema);
