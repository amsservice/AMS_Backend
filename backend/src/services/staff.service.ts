import mongoose, { Types } from 'mongoose';
import { Staff } from '../models/Staff';
import { Class } from "../models/Class";
import type { UserRole } from '../utils/jwt';

export class StaffService {

  static async bulkCreateStaff(
    params: {
      schoolId: Types.ObjectId;
      sessionId: Types.ObjectId;
    },
    staffRows: Array<{
      name: string;
      email: string;
      password: string;
      phone: string;
      dob: Date;
      gender: 'male' | 'female' | 'other';
      highestQualification?: string;
      experienceYears?: number;
      address?: string;
      role?: string;
    }>
  ) {
    if (!staffRows.length) {
      throw new Error('No staff provided');
    }

    const validationErrors: { row: number; message: string }[] = [];
    const seenEmails = new Set<string>();

    staffRows.forEach((s, index) => {
      const row = index + 1;

      const trimmedName = String(s.name || '').trim();
      const lettersInName = (trimmedName.match(/[A-Za-z]/g) || []).length;
      if (!trimmedName) validationErrors.push({ row, message: 'Name is required' });
      else if (lettersInName < 3)
        validationErrors.push({ row, message: 'Name must contain at least 3 letters' });

      const email = String(s.email || '').trim().toLowerCase();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!email) validationErrors.push({ row, message: 'Email is required' });
      else if (!emailOk) validationErrors.push({ row, message: 'Email is invalid' });

      if (email) {
        if (seenEmails.has(email)) {
          validationErrors.push({ row, message: 'Duplicate email in CSV' });
        }
        seenEmails.add(email);
      }

      const password = String(s.password || '');
      if (!password) validationErrors.push({ row, message: 'Password is required' });
      else if (password.length < 6)
        validationErrors.push({ row, message: 'Password must be at least 6 characters' });

      const phone = String(s.phone || '').trim();
      if (!phone) validationErrors.push({ row, message: 'Phone is required' });
      else if (!/^\d{10}$/.test(phone))
        validationErrors.push({ row, message: 'Phone must be exactly 10 digits (numbers only)' });

      const dob = s.dob;
      if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) {
        validationErrors.push({ row, message: 'DOB is invalid' });
      }

      if (!s.gender) validationErrors.push({ row, message: 'Gender is required' });
      else if (!['male', 'female', 'other'].includes(s.gender))
        validationErrors.push({ row, message: 'Gender is invalid' });

      const normalizedRole = String(s.role ?? '').trim().toLowerCase() || 'teacher';
      if (!['teacher', 'coordinator'].includes(normalizedRole)) {
        validationErrors.push({ row, message: 'Role must be teacher or coordinator' });
      }
    });

    if (validationErrors.length) {
      return {
        success: false,
        validationErrors
      };
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      for (const row of staffRows) {
        const normalizedRole = String(row.role ?? '').trim().toLowerCase() || 'teacher';
        const roles = [normalizedRole] as Array<'teacher' | 'coordinator'>;
        const staff = new Staff({
          name: String(row.name).trim(),
          email: String(row.email).trim().toLowerCase(),
          password: String(row.password),
          phone: String(row.phone).trim(),
          dob: row.dob,
          gender: row.gender,
          highestQualification:
            row.highestQualification !== undefined && String(row.highestQualification).trim() !== ''
              ? String(row.highestQualification).trim()
              : undefined,
          experienceYears: typeof row.experienceYears === 'number' ? row.experienceYears : undefined,
          address:
            row.address !== undefined && String(row.address).trim() !== ''
              ? String(row.address).trim()
              : undefined,
          schoolId: params.schoolId,
          roles,
          history: []
        });

        (staff as any)._roleSessionId = params.sessionId;
        await staff.save({ session: mongoSession });
      }

      await mongoSession.commitTransaction();
      return {
        success: true,
        successCount: staffRows.length,
        message: 'Staff uploaded successfully'
      };
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  }

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
