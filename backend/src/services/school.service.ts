// import { School } from '../models/School';
// import { Types } from 'mongoose';

// export class SchoolService {
//   static async getSchool(schoolId: Types.ObjectId) {
//     const school = await School.findById(schoolId)
//       .populate('principalId', 'name email');
 

//     if (!school) throw new Error('School not found');
//     if (!school.isActive) throw new Error('School inactive');

//     return school;
//   }

//   static async updateSchool(
//     schoolId: Types.ObjectId,
//     data: Partial<{
//       name: string;
//       phone: string;
//       address: string;
//       pincode: string;
//     }>
//   ) {
//     return School.findByIdAndUpdate(schoolId, data, { new: true });
//   }
// }

import { Types } from 'mongoose';
import { School } from '../models/School';

export class SchoolService {
  /* ===============================
     GET MY SCHOOL (FULL DATA)
  =============================== */
  static async getSchool(schoolId: Types.ObjectId) {
    const school = await School.findById(schoolId)
      .populate(
        'principalId',
        'name email phone'
      )
      .populate(
        'subscriptionId',
        'planId billableStudents paidAmount startDate endDate status'
      )
      .lean();

    if (!school) {
      throw new Error('School not found');
    }

    if (!school.isActive) {
      throw new Error('School inactive');
    }

    return {
      id: school._id.toString(),
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      pincode: school.pincode,

      /* ===============================
         PRINCIPAL (SUMMARY)
      =============================== */
      principal: school.principalId
        ? {
            id: (school.principalId as any)._id.toString(),
            name: (school.principalId as any).name,
            email: (school.principalId as any).email,
            phone: (school.principalId as any).phone
          }
        : null,

      /* ===============================
         SUBSCRIPTION (IMPORTANT)
      =============================== */
      subscription: school.subscriptionId
        ? {
            id: (school.subscriptionId as any)._id.toString(),
            planId: (school.subscriptionId as any).planId,
            billableStudents: (school.subscriptionId as any).billableStudents,
            paidAmount: (school.subscriptionId as any).paidAmount,
            startDate: (school.subscriptionId as any).startDate,
            endDate: (school.subscriptionId as any).endDate,
            status: (school.subscriptionId as any).status
          }
        : null,

      isActive: school.isActive,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt
    };
  }

  /* ===============================
     UPDATE SCHOOL (ONLY SCHOOL DATA)
  =============================== */
  static async updateSchool(
    schoolId: Types.ObjectId,
    data: Partial<{
      name: string;
      phone: string;
      address: string;
      pincode: string;
    }>
  ) {
    const school = await School.findOneAndUpdate(
      { _id: schoolId, isActive: true },
      { $set: data },
      { new: true }
    ).lean();

    if (!school) {
      throw new Error('School not found or inactive');
    }

    return {
      id: school._id.toString(),
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      pincode: school.pincode,
      isActive: school.isActive
    };
  }
}
