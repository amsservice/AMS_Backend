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
        'name email phone gender yearsOfExperience'
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
         SCHOOL DETAILS (NEW)
      =============================== */
      schoolType: school.schoolType,
      board: school.board,
      city: school.city,
      district: school.district,
      state: school.state,

      /* ===============================
         PRINCIPAL (SUMMARY)
      =============================== */
      principal: school.principalId
        ? {
          id: (school.principalId as any)._id.toString(),
          name: (school.principalId as any).name,
          email: (school.principalId as any).email,
          phone: (school.principalId as any).phone,
          gender: (school.principalId as any).gender,
          yearsOfExperience: (school.principalId as any).yearsOfExperience

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
      schoolType: 'Government' | 'Private' | 'Semi-Private';
      board: string;
      city: string;
      district: string;
      state: string;

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
        schoolType: school.schoolType,
      board: school.board,
      city: school.city,
      district: school.district,
      state: school.state,
      isActive: school.isActive
    };
  }


  /* ===============================
   GET SCHOOL BY SCHOOL CODE
=============================== */
static async getSchoolByCode(schoolCode: number) {
  if (!schoolCode || isNaN(schoolCode)) {
    throw new Error('Invalid school code');
  }

  const school = await School.findOne(
    { schoolCode, isActive: true },
    'name schoolCode'
  ).lean();

  if (!school) {
    throw new Error('Invalid school code');
  }

  return {
    id: school._id.toString(),
    name: school.name,
    schoolCode: school.schoolCode
  };
}

}
