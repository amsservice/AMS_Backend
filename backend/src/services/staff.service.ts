import mongoose, { Types } from 'mongoose';
import { Staff } from '../models/Staff';
import { Class } from "../models/Class";
import { Session } from '../models/Session';
import type { UserRole } from '../utils/jwt';
import bcrypt from 'bcryptjs';

interface BulkStaffInput {
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
    const email = String(data.email || '').trim().toLowerCase();

    const existing = await Staff.findOne({ email }).select('email schoolId isActive');
    if (existing) {
      const sameSchool = String(existing.schoolId) === String(schoolId);

      if (!sameSchool) {
        const err: any = new Error('Email already exists');
        err.code = 11000;
        throw err;
      }

      if (existing.isActive === false) {
        const err: any = new Error('Email already exists with inactive status');
        err.code = 'TEACHER_INACTIVE_EMAIL_EXISTS';
        err.teacherId = String(existing._id);
        err.email = existing.email;
        throw err;
      }

      const err: any = new Error('Email already exists');
      err.code = 11000;
      throw err;
    }

    const roles = data.roles?.length ? data.roles : ['teacher'];

    const staff = new Staff({
      ...data,
      email,
      roles,
      schoolId,
      history: []
    });

    (staff as any)._roleSessionId = sessionId;
    await staff.save();

    return staff;
  }

  // static async bulkCreateStaff(
  //   params: {
  //     schoolId: Types.ObjectId;
  //     sessionId: Types.ObjectId;
  //   },
  //   staffRows: BulkStaffInput[]
  // ) {
  //   if (!staffRows.length) {
  //     throw new Error('No staff provided');
  //   }

  //   const validationErrors: { row: number; message: string }[] = [];
  //   const seenEmails = new Set<string>();

  //   const normalizedEmails = staffRows.map((s) => String(s.email || '').trim().toLowerCase());
  //   const existing = await Staff.find({ email: { $in: normalizedEmails } })
  //     .select('email schoolId isActive')
  //     .lean();
  //   const existingByEmail = new Map<string, any>();
  //   existing.forEach((doc: any) => existingByEmail.set(String(doc.email).toLowerCase(), doc));

  //   staffRows.forEach((s, index) => {
  //     const row = index + 1;

  //     const trimmedName = String(s.name || '').trim();
  //     const lettersInName = (trimmedName.match(/[A-Za-z]/g) || []).length;
  //     if (!trimmedName) validationErrors.push({ row, message: 'Name is required' });
  //     else if (lettersInName < 3)
  //       validationErrors.push({ row, message: 'Name must contain at least 3 letters' });

  //     const email = String(s.email || '').trim().toLowerCase();
  //     const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  //     if (!email) validationErrors.push({ row, message: 'Email is required' });
  //     else if (!emailOk) validationErrors.push({ row, message: 'Email is invalid' });

  //     if (email) {
  //       if (seenEmails.has(email)) {
  //         validationErrors.push({ row, message: 'Duplicate email in CSV' });
  //       }
  //       seenEmails.add(email);

  //       const existingStaff = existingByEmail.get(email);
  //       if (existingStaff) {
  //         const sameSchool = String(existingStaff.schoolId) === String(params.schoolId);
  //         if (!sameSchool) {
  //           validationErrors.push({ row, message: 'Email already exists' });
  //         } else if (existingStaff.isActive === false) {
  //           validationErrors.push({ row, message: 'Email already exists with inactive status' });
  //         } else {
  //           validationErrors.push({ row, message: 'Email already exists' });
  //         }
  //       }
  //     }

  //     const password = String(s.password || '');
  //     if (!password) validationErrors.push({ row, message: 'Password is required' });
  //     else if (password.length < 6)
  //       validationErrors.push({ row, message: 'Password must be at least 6 characters' });

  //     const phone = String(s.phone || '').trim();
  //     if (!phone) validationErrors.push({ row, message: 'Phone is required' });
  //     else if (!/^\d{10}$/.test(phone))
  //       validationErrors.push({ row, message: 'Phone must be exactly 10 digits (numbers only)' });

  //     const dob = s.dob;
  //     let ageYears: number | null = null;
  //     if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) {
  //       validationErrors.push({ row, message: 'DOB is invalid' });
  //     } else {
  //       const today = new Date();
  //       if (dob.getTime() > today.getTime()) {
  //         validationErrors.push({ row, message: 'DOB cannot be in the future' });
  //       } else {
  //         const age =
  //           today.getFullYear() -
  //           dob.getFullYear() -
  //           (today.getMonth() < dob.getMonth() ||
  //           (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  //             ? 1
  //             : 0);
  //         ageYears = age;
  //         if (age < 18) validationErrors.push({ row, message: 'DOB must be at least 18 years ago' });
  //       }
  //     }

  //     if (!s.gender) validationErrors.push({ row, message: 'Gender is required' });
  //     else if (!['male', 'female', 'other'].includes(s.gender))
  //       validationErrors.push({ row, message: 'Gender is invalid' });

  //     if (s.highestQualification !== undefined && String(s.highestQualification).trim() !== '') {
  //       const hq = String(s.highestQualification).trim();
  //       const letters = (hq.match(/[A-Za-z]/g) || []).length;
  //       if (letters < 2)
  //         validationErrors.push({ row, message: 'Highest qualification must contain at least 2 letters' });
  //       if (hq.length > 100)
  //         validationErrors.push({ row, message: 'Highest qualification cannot exceed 100 characters' });
  //     }

  //     if (s.experienceYears !== undefined) {
  //       const n = s.experienceYears;
  //       if (!Number.isFinite(n) || !Number.isInteger(n)) {
  //         validationErrors.push({ row, message: 'Experience years must be a whole number' });
  //       } else {
  //         if (n < 0) validationErrors.push({ row, message: 'Experience cannot be negative' });
  //         if (n > 42) validationErrors.push({ row, message: 'Experience cannot be greater than 42 years' });

  //         if (ageYears !== null) {
  //           if (n > ageYears)
  //             validationErrors.push({ row, message: 'Experience years cannot be greater than age' });
  //           else if (ageYears - n < 14)
  //             validationErrors.push({ row, message: 'DOB and experience years difference must be at least 14 years' });
  //         }
  //       }
  //     }

  //     if (s.address !== undefined && String(s.address).trim() !== '') {
  //       const addr = String(s.address).trim();
  //       const letters = (addr.match(/[A-Za-z]/g) || []).length;
  //       if (letters < 5) validationErrors.push({ row, message: 'Address must contain at least 5 letters' });
  //       if (addr.length > 250) validationErrors.push({ row, message: 'Address cannot exceed 250 characters' });
  //     }
  //   });

  //   if (validationErrors.length) {
  //     return {
  //       success: false,
  //       validationErrors
  //     };
  //   }

  //   const preparedDocs = await Promise.all(
  //     staffRows.map(async (s) => {
  //       const roles = s.roles?.length ? s.roles : ['teacher'];
  //       const hashedPassword = await bcrypt.hash(String(s.password), 10);

  //       return {
  //         name: String(s.name).trim(),
  //         email: String(s.email).trim().toLowerCase(),
  //         password: hashedPassword,
  //         phone: String(s.phone).trim(),
  //         dob: s.dob,
  //         gender: s.gender,
  //         highestQualification:
  //           s.highestQualification !== undefined && String(s.highestQualification).trim() !== ''
  //             ? String(s.highestQualification).trim()
  //             : undefined,
  //         experienceYears: typeof s.experienceYears === 'number' ? s.experienceYears : undefined,
  //         address:
  //           s.address !== undefined && String(s.address).trim() !== ''
  //             ? String(s.address).trim()
  //             : undefined,
  //         roles,
  //         schoolId: params.schoolId,
  //         history: [],
  //         roleHistory: [
  //           {
  //             roles,
  //             sessionId: params.sessionId,
  //             changedAt: new Date()
  //           }
  //         ]
  //       };
  //     })
  //   );

  //   const mongoSession = await mongoose.startSession();
  //   mongoSession.startTransaction();

  //   try {
  //     await Staff.insertMany(preparedDocs, { session: mongoSession });
  //     await mongoSession.commitTransaction();
  //     return {
  //       success: true,
  //       successCount: preparedDocs.length,
  //       message: 'Staff uploaded successfully'
  //     };
  //   } catch (err) {
  //     await mongoSession.abortTransaction();
  //     throw err;
  //   } finally {
  //     mongoSession.endSession();
  //   }
  // }

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

    const hasAssignedClass = await Class.exists({ teacherId: staff._id });
    if (hasAssignedClass) {
      const err: any = new Error('Cannot deactivate staff while a class is assigned. Please reassign the class first.');
      err.code = 'STAFF_CLASS_ASSIGNED';
      throw err;
    }

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
  static async listStaff(
    schoolId: Types.ObjectId,
    opts?: {
      page?: number;
      limit?: number;
      q?: string;
      isActive?: boolean;
    }
  ) {
    const pageRaw = typeof opts?.page === 'number' && Number.isFinite(opts.page) ? opts.page : undefined;
    const limitRaw = typeof opts?.limit === 'number' && Number.isFinite(opts.limit) ? opts.limit : undefined;
    const page = pageRaw && pageRaw > 0 ? pageRaw : 1;
    const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 200) : undefined;

    const filter: any = { schoolId };
    if (typeof opts?.isActive === 'boolean') {
      filter.isActive = opts.isActive;
    }
    if (opts?.q && String(opts.q).trim()) {
      const q = String(opts.q).trim();
      filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
    }

    const activeSession = await Session.findOne({ schoolId, isActive: true }).select('_id').lean();

    const query = Staff.find(filter)
      .select('name email isActive roles')
      .sort({ name: 1, _id: 1 })
      .lean();

    let total: number | undefined;
    if (limit !== undefined) {
      total = await Staff.countDocuments(filter);
      query.skip((page - 1) * limit).limit(limit);
    }

    const staff = await query;

    const teacherIds = staff.map((s: any) => s?._id).filter(Boolean);

    const assignedByTeacherId = new Map<string, any>();
    if (activeSession?._id && teacherIds.length) {
      const assigned = await Class.find({
        schoolId,
        sessionId: activeSession._id,
        teacherId: { $in: teacherIds }
      })
        .select('teacherId name section')
        .lean();

      assigned.forEach((c: any) => {
        if (!c?.teacherId) return;
        assignedByTeacherId.set(String(c.teacherId), c);
      });
    }

    const items = staff.map((s: any) => {
      const cls = assignedByTeacherId.get(String(s._id));
      return {
        ...s,
        id: String(s._id),
        currentClass: cls
          ? {
              classId: String(cls._id),
              className: cls.name,
              section: cls.section
            }
          : undefined
      };
    });

    if (limit !== undefined) {
      return {
        items,
        total: total || 0,
        page,
        limit
      };
    }

    return items;
  }

  static async updateStaff(schoolId: Types.ObjectId, staffId: string, data: any) {
    const staff = await Staff.findOne({ _id: staffId, schoolId }).select('+password');
    if (!staff) throw new Error('Staff not found');

    if (Array.isArray(data?.roles)) {
      const normalizedIncomingRoles = Array.from(
        new Set((data.roles as any[]).map((r) => String(r).trim()))
      ).filter((r) => r === 'teacher' || r === 'coordinator');

      normalizedIncomingRoles.sort();
      const normalizedCurrentRoles = Array.from(
        new Set((staff.roles as any[]).map((r) => String(r).trim()))
      );
      normalizedCurrentRoles.sort();

      const rolesChanged =
        normalizedIncomingRoles.length !== normalizedCurrentRoles.length ||
        normalizedIncomingRoles.some((r, i) => r !== normalizedCurrentRoles[i]);

      if (rolesChanged) {
        const activeSession = await Session.findOne({ schoolId, isActive: true })
          .select('_id')
          .lean();

        const sessionIdToUse =
          activeSession?._id ||
          (staff.roleHistory?.length ? staff.roleHistory[staff.roleHistory.length - 1].sessionId : undefined);

        if (sessionIdToUse) {
          (staff as any)._roleSessionId = sessionIdToUse;
        }

        data.roles = normalizedIncomingRoles;
      }
    }

    Object.assign(staff, data);
    return staff.save();
  }

  static async deleteStaff(schoolId: Types.ObjectId, staffId: string) {
    await this.deactivateStaff(schoolId, staffId);
    return { message: 'Staff deactivated successfully' };
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

  if (Array.isArray(data?.roles)) {
    const normalizedIncomingRoles = Array.from(
      new Set((data.roles as any[]).map((r) => String(r).trim()))
    ).filter((r) => r === 'teacher' || r === 'coordinator');

    normalizedIncomingRoles.sort();

    const normalizedCurrentRoles = Array.from(
      new Set((staff.roles as any[]).map((r) => String(r).trim()))
    );
    normalizedCurrentRoles.sort();

    const rolesChanged =
      normalizedIncomingRoles.length !== normalizedCurrentRoles.length ||
      normalizedIncomingRoles.some((r, i) => r !== normalizedCurrentRoles[i]);

    if (rolesChanged) {
      const activeSession = await Session.findOne({
        schoolId: params.schoolId,
        isActive: true
      })
        .select('_id')
        .lean();

      const sessionIdToUse =
        activeSession?._id ||
        (staff.roleHistory?.length ? staff.roleHistory[staff.roleHistory.length - 1].sessionId : undefined);

      if (sessionIdToUse) {
        (staff as any)._roleSessionId = sessionIdToUse;
      }

      data.roles = normalizedIncomingRoles;
    }
  }

  if (Array.isArray(data?.roles) && !data.roles.includes('teacher')) {
    const hasAssignedClass = await Class.exists({ teacherId: staff._id });
    if (hasAssignedClass) {
      const err: any = new Error('Cannot remove teacher role while a class is assigned. Please reassign the class first.');
      err.code = 'STAFF_CLASS_ASSIGNED';
      throw err;
    }
  }

  Object.assign(staff, data);
  await staff.save();

  return staff.toObject({ versionKey: false });
}
}
