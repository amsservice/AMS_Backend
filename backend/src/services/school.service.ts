import { School } from '../models/School';
import { Types } from 'mongoose';

export class SchoolService {
  static async getSchool(schoolId: Types.ObjectId) {
    const school = await School.findById(schoolId)
      .populate('principalId', 'name email');
 

    if (!school) throw new Error('School not found');
    if (!school.isActive) throw new Error('School inactive');

    return school;
  }

  static async updateSchool(
    schoolId: Types.ObjectId,
    data: Partial<{
      name: string;
      phone: string;
      address: string;
      pincode: string;
    }>
  ) {
    return School.findByIdAndUpdate(schoolId, data, { new: true });
  }
}
