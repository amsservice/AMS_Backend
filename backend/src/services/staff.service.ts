import mongoose, { Types } from 'mongoose';
import { Staff } from '../models/Staff';
import { Class } from "../models/Class";
import type { UserRole } from '../utils/jwt';

export class StaffService {

  /* ======================================================
     CREATE STAFF (Principal)
  ====================================================== */
  static async createStaff(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId,
    data: {
      name: string;
      email: string;
      password: string;
      phone: string;
      dob: Date;
      gender: 'male' | 'female' | 'other';
      highestQualification?: string;
      experienceYears?: number;
      address?: string;
      roles?: ("teacher" | "coordinator")[];
    }
  ) {
    const roles = data.roles?.length ? data.roles : ['teacher'];

    const staff = new Staff({
      ...data,
      roles,
      schoolId,
      history: []
    });

    (staff as any)._roleSessionId = sessionId;
    await staff.save();

    return staff;
  }

  /* ======================================================
     ASSIGN CLASS (Principal)
  ====================================================== */
  static async assignClass(
    schoolId: Types.ObjectId,
    data: {
      staffId: string;
      sessionId: Types.ObjectId;
      classId: Types.ObjectId;
      className: string;
      section: string;
    }
  ) {
    const staff = await Staff.findOne({
      _id: data.staffId,
      schoolId,
      isActive: true,
      roles: 'teacher'
    });

    if (!staff) throw new Error('Teacher staff not found');

    const classDoc = await Class.findOne({
      _id: data.classId,
      schoolId,
      sessionId: data.sessionId
    });

    if (!classDoc) throw new Error('Class not found');

    await Class.updateMany(
      { teacherId: staff._id, sessionId: data.sessionId },
      { $unset: { teacherId: 1 } }
    );

    classDoc.teacherId = staff._id;
    await classDoc.save();

    staff.history.forEach(h => {
      if (h.sessionId.toString() === data.sessionId.toString()) {
        h.isActive = false;
      }
    });

    staff.history.push({
      sessionId: data.sessionId,
      classId: data.classId,
      className: data.className,
      section: data.section,
      isActive: true
    });

    await staff.save();

    return { message: 'class assigned successfully' };
  }

  /* ======================================================
     DEACTIVATE STAFF
  ====================================================== */
  static async deactivateStaff(schoolId: Types.ObjectId, staffId: string) {
    const staff = await Staff.findOne({ _id: staffId, schoolId });
    if (!staff) throw new Error('Staff not found');

    await Class.updateMany(
      { teacherId: staff._id },
      { $unset: { teacherId: 1 } }
    );

    staff.history.forEach(h => (h.isActive = false));
    staff.isActive = false;
    staff.leftAt = new Date();

    await staff.save();

    return { message: 'Staff deactivated successfully' };
  }

  static async activateStaff(schoolId: Types.ObjectId, staffId: string) {
    const staff = await Staff.findOne({ _id: staffId, schoolId });
    if (!staff) throw new Error('Staff not found');

    staff.isActive = true;
    staff.leftAt = undefined;
    await staff.save();

    return { message: 'Staff activated successfully' };
  }

  /* ======================================================
   SWAP STAFF (TEACHERS) BETWEEN TWO CLASSES
   Principal / Coordinator
====================================================== */
static async swapStaffClasses(
  schoolId: Types.ObjectId,
  data: {
    sessionId: Types.ObjectId;

    staffAId: string;
    classAId: Types.ObjectId;
    classAName: string;
    sectionA: string;

    staffBId: string;
    classBId: Types.ObjectId;
    classBName: string;
    sectionB: string;
  }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const staffA = await Staff.findOne({
      _id: data.staffAId,
      schoolId,
      isActive: true,
      roles: 'teacher'
    }).session(session);

    const staffB = await Staff.findOne({
      _id: data.staffBId,
      schoolId,
      isActive: true,
      roles: 'teacher'
    }).session(session);

    if (!staffA || !staffB) {
      throw new Error('Both staff members must be active teachers');
    }

    /* 1️⃣ REMOVE BOTH FROM CLASSES */
    await Class.updateMany(
      { _id: { $in: [data.classAId, data.classBId] } },
      { $unset: { teacherId: 1 } },
      { session }
    );

    /* 2️⃣ ASSIGN SWAPPED */
    await Class.findByIdAndUpdate(
      data.classAId,
      { teacherId: staffB._id },
      { session }
    );

    await Class.findByIdAndUpdate(
      data.classBId,
      { teacherId: staffA._id },
      { session }
    );

    /* 3️⃣ UPDATE STAFF A HISTORY */
    staffA.history.forEach(h => {
      if (h.sessionId.toString() === data.sessionId.toString()) {
        h.isActive = false;
      }
    });

    staffA.history.push({
      sessionId: data.sessionId,
      classId: data.classBId,
      className: data.classBName,
      section: data.sectionB,
      isActive: true
    });

    /* 4️⃣ UPDATE STAFF B HISTORY */
    staffB.history.forEach(h => {
      if (h.sessionId.toString() === data.sessionId.toString()) {
        h.isActive = false;
      }
    });

    staffB.history.push({
      sessionId: data.sessionId,
      classId: data.classAId,
      className: data.classAName,
      section: data.sectionA,
      isActive: true
    });

    await staffA.save({ session });
    await staffB.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { message: 'Staff classes swapped successfully' };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw error;
  }
}


  /* ======================================================
     GET / UPDATE OWN PROFILE
  ====================================================== */
  static async getMyProfile(staffId: string) {
    return Staff.findById(staffId).select('-password');
  }

  static async updateMyProfile(staffId: string, data: any) {
    const staff = await Staff.findById(staffId).select('+password');
    if (!staff) throw new Error('Staff not found');

    Object.assign(staff, data);
    return staff.save();
  }

  /* ======================================================
     LIST STAFF
  ====================================================== */
  static async listStaff(schoolId: Types.ObjectId) {
    return Staff.find({ schoolId }).select('-password');
  }

  static async updateStaff(schoolId: Types.ObjectId, staffId: string, data: any) {
    const staff = await Staff.findOne({ _id: staffId, schoolId }).select('+password');
    if (!staff) throw new Error('Staff not found');

    Object.assign(staff, data);
    return staff.save();
  }

  static async deleteStaff(schoolId: Types.ObjectId, staffId: string) {
    const staff = await Staff.findOneAndDelete({ _id: staffId, schoolId });
    if (!staff) throw new Error('Staff not found');

    return { message: 'Staff deleted successfully' };
  }

  /* ======================================================
     CHANGE PASSWORD
  ====================================================== */
  static async changeMyPassword(staffId: string, oldPassword: string, newPassword: string) {
    const staff = await Staff.findById(staffId).select('+password');
    if (!staff) throw new Error('Staff not found');

    const isMatch = await staff.comparePassword(oldPassword);
    if (!isMatch) throw new Error('Old password incorrect');

    staff.password = newPassword;
    await staff.save();

    return { message: 'Password changed successfully' };
  }

  /* ======================================================
     DASHBOARD
  ====================================================== */
  static async countActiveTeachers(schoolId: Types.ObjectId) {
    return Staff.countDocuments({
      schoolId,
      roles: 'teacher',
      isActive: true
    });
  }

  /* ======================================================
     FULL PROFILE
  ====================================================== */
  static async getStaffFullProfile(staffId: string) {
    const staff = await Staff.findById(staffId)
      .select('-password')
      .populate('schoolId', 'name')
      .populate('history.sessionId', 'name')
      .populate('history.classId', 'name section')
      .lean();

    if (!staff) throw new Error('Staff not found');
    return staff;
  }

  /* ======================================================
     UPDATE PROFILE BY ROLE
  ====================================================== */
static async updateStaffProfile(
  params: {
    schoolId: Types.ObjectId;
    requesterRole: UserRole[];   // array
    requesterId: string;
    staffId?: string;
  },
  data: any
) {
  let staffIdToUpdate: string;

  // Teacher can update only self
  if (params.requesterRole.includes('teacher')) {
    staffIdToUpdate = params.requesterId;
  }

  // Principal or Coordinator can update anyone
  else if (
    params.requesterRole.includes('principal') ||
    params.requesterRole.includes('coordinator')
  ) {
    if (!params.staffId) throw new Error('Staff ID required');
    staffIdToUpdate = params.staffId;
  }

  else {
    throw new Error('Not allowed');
  }

  const staff = await Staff.findOne({
    _id: staffIdToUpdate,
    schoolId: params.schoolId
  });

  if (!staff) throw new Error('Staff not found');

  Object.assign(staff, data);
  await staff.save();

  return staff.toObject({ versionKey: false });
}
}
