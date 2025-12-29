import { Types } from 'mongoose';
import { Holiday, IHoliday, HolidayCategory } from '../models/Holiday';

export interface CreateHolidayInput {
  name: string;
  date: Date;
  description?: string;
  category: HolidayCategory;
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
}

export interface UpdateHolidayInput {
  name?: string;
  date?: Date;
  description?: string;
  category?: HolidayCategory;
}

export class HolidayService {
  static createHoliday(data: CreateHolidayInput): Promise<IHoliday> {
    return Holiday.create(data);
  }

  static getHolidays(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ): Promise<IHoliday[]> {
    return Holiday.find({ schoolId, sessionId }).sort({ date: 1 });
  }

  static updateHoliday(
    id: Types.ObjectId,
    schoolId: Types.ObjectId,
    data: UpdateHolidayInput
  ): Promise<IHoliday | null> {
    return Holiday.findOneAndUpdate(
      { _id: id, schoolId },
      data,
      { new: true }
    );
  }

  static deleteHoliday(
    id: Types.ObjectId,
    schoolId: Types.ObjectId
  ): Promise<IHoliday | null> {
    return Holiday.findOneAndDelete({ _id: id, schoolId });
  }
}
