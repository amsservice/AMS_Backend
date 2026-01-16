import { Types } from 'mongoose';
import { Holiday, IHoliday, HolidayCategory } from '../models/Holiday';

export interface CreateHolidayInput {
  name: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  category: HolidayCategory;
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
}

export interface UpdateHolidayInput {
  name?: string;
  startDate?: Date;
  endDate?: Date | null; // frontend may be send null
  description?: string;
  category?: HolidayCategory;
}

/* 🔒 Overlap Validator */

async function checkOverlap(
  schoolId: Types.ObjectId,
  sessionId: Types.ObjectId,
  startDate: Date,
  endDate?: Date,
  excludeId?: Types.ObjectId
) {
  const effectiveEndDate = endDate ?? startDate;

  const conflict = await Holiday.findOne({
    schoolId,
    sessionId,
    ...(excludeId && { _id: { $ne: excludeId } }),
    $expr: {
      $and: [
        { $lte: ['$startDate', effectiveEndDate] },
        {
          $gte: [
            { $ifNull: ['$endDate', '$startDate'] },
            startDate
          ]
        }
      ]
    }
  });

  if (conflict) {
    throw new Error('Holiday dates overlap with an existing holiday');
  }
}



export class HolidayService {
  static async createHoliday(data: CreateHolidayInput): Promise<IHoliday> {
    await checkOverlap(
      data.schoolId,
      data.sessionId,
      data.startDate,
      data.endDate
    );
    return Holiday.create(data);
  }
/* -------- READ -------- */
  static getHolidays(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ): Promise<IHoliday[]> {
    return Holiday.find({ schoolId, sessionId }).sort({startDate: 1 });
  }
  /* -------- UPDATE -------- */
  static async updateHoliday(
    id: Types.ObjectId,
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId,
    data: UpdateHolidayInput
  ): Promise<IHoliday | null> {
   // ✅ normalize null → undefined
    const normalizedEndDate =
      data.endDate === null ? undefined : data.endDate;

    if (data.startDate) {
      await checkOverlap(
        schoolId,
        sessionId,
        data.startDate,
        normalizedEndDate,
        id
      );
    }

    return Holiday.findOneAndUpdate(
      { _id: id, schoolId },
      {
        ...data,
        endDate: normalizedEndDate
      },
      { new: true, runValidators: true }
    );
  }

  static deleteHoliday(
    id: Types.ObjectId,
    schoolId: Types.ObjectId
  ): Promise<IHoliday | null> {
    return Holiday.findOneAndDelete({ _id: id, schoolId });
  }
}
