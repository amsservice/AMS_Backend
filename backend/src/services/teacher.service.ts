import mongoose, { Types } from 'mongoose';
import { Teacher } from '../models/Teacher';
import { Class } from "../models/Class";
import type { UserRole } from '../utils/jwt';

interface BulkTeacherInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: Date;
  gender: 'male' | 'female' | 'other';
  highestQualification?: string;
  experienceYears?: number;
  address?: string;
}

export class TeacherService {
  /* 
     CREATE TEACHER (Principal)
   */
  static async createTeacher(
    schoolId: Types.ObjectId,
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
    }
  ) {
    const email = String(data.email || '').trim().toLowerCase();

    const existing = await Teacher.findOne({ email });
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

    return Teacher.create({ ...data, email, schoolId, history: [] });
  }

  /*
     PRINCIPAL: REACTIVATE TEACHER
  */
  static async reactivateTeacher(schoolId: Types.ObjectId, teacherId: string) {
    const teacher = await Teacher.findOne({
      _id: teacherId,
      schoolId
    });

    if (!teacher) throw new Error('Teacher not found');

    teacher.isActive = true;
    teacher.leftAt = undefined;
    await teacher.save();

    return { message: 'Teacher activated successfully' };
  }

  static async bulkCreateTeachers(
    params: {
      schoolId: Types.ObjectId;
    },
    teachers: BulkTeacherInput[]
  ) {
    if (!teachers.length) {
      throw new Error('No teachers provided');
    }

    const validationErrors: { row: number; message: string }[] = [];
    const seenEmails = new Set<string>();

    teachers.forEach((t, index) => {
      const row = index + 1;

      const trimmedName = String(t.name || '').trim();
      const lettersInName = (trimmedName.match(/[A-Za-z]/g) || []).length;
      if (!trimmedName) validationErrors.push({ row, message: 'Name is required' });
      else if (lettersInName < 3)
        validationErrors.push({ row, message: 'Name must contain at least 3 letters' });

      const email = String(t.email || '').trim().toLowerCase();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!email) validationErrors.push({ row, message: 'Email is required' });
      else if (!emailOk) validationErrors.push({ row, message: 'Email is invalid' });

      if (email) {
        if (seenEmails.has(email)) {
          validationErrors.push({ row, message: 'Duplicate email in CSV' });
        }
        seenEmails.add(email);
      }

      const password = String(t.password || '');
      if (!password) validationErrors.push({ row, message: 'Password is required' });
      else if (password.length < 6)
        validationErrors.push({ row, message: 'Password must be at least 6 characters' });

      const phone = String(t.phone || '').trim();
      if (!phone) validationErrors.push({ row, message: 'Phone is required' });
      else if (!/^\d{10}$/.test(phone))
        validationErrors.push({ row, message: 'Phone must be exactly 10 digits (numbers only)' });

      const dob = t.dob;
      let ageYears: number | null = null;
      if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) {
        validationErrors.push({ row, message: 'DOB is invalid' });
      } else {
        const today = new Date();
        if (dob.getTime() > today.getTime()) {
          validationErrors.push({ row, message: 'DOB cannot be in the future' });
        } else {
          const age =
            today.getFullYear() -
            dob.getFullYear() -
            (today.getMonth() < dob.getMonth() ||
            (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
              ? 1
              : 0);
          ageYears = age;
          if (age < 18) validationErrors.push({ row, message: 'DOB must be at least 18 years ago' });
        }
      }

      if (!t.gender) validationErrors.push({ row, message: 'Gender is required' });
      else if (!['male', 'female', 'other'].includes(t.gender))
        validationErrors.push({ row, message: 'Gender is invalid' });

      if (t.highestQualification !== undefined && String(t.highestQualification).trim() !== '') {
        const hq = String(t.highestQualification).trim();
        const letters = (hq.match(/[A-Za-z]/g) || []).length;
        if (letters < 2)
          validationErrors.push({ row, message: 'Highest qualification must contain at least 2 letters' });
        if (hq.length > 100)
          validationErrors.push({ row, message: 'Highest qualification cannot exceed 100 characters' });
      }

      if (t.experienceYears !== undefined) {
        const n = t.experienceYears;
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          validationErrors.push({ row, message: 'Experience years must be a whole number' });
        } else {
          if (n < 0) validationErrors.push({ row, message: 'Experience cannot be negative' });
          if (n > 42) validationErrors.push({ row, message: 'Experience cannot be greater than 42 years' });

          if (ageYears !== null) {
            if (n > ageYears)
              validationErrors.push({ row, message: 'Experience years cannot be greater than age' });
            else if (ageYears - n < 14)
              validationErrors.push({ row, message: 'DOB and experience years difference must be at least 14 years' });
          }
        }
      }

      if (t.address !== undefined && String(t.address).trim() !== '') {
        const addr = String(t.address).trim();
        const letters = (addr.match(/[A-Za-z]/g) || []).length;
        if (letters < 5) validationErrors.push({ row, message: 'Address must contain at least 5 letters' });
        if (addr.length > 250) validationErrors.push({ row, message: 'Address cannot exceed 250 characters' });
      }
    });

    if (validationErrors.length) {
      return {
        success: false,
        validationErrors
      };
    }

    const preparedDocs = teachers.map(t => ({
      name: String(t.name).trim(),
      email: String(t.email).trim().toLowerCase(),
      password: t.password,
      phone: String(t.phone).trim(),
      dob: t.dob,
      gender: t.gender,
      highestQualification:
        t.highestQualification !== undefined && String(t.highestQualification).trim() !== ''
          ? String(t.highestQualification).trim()
          : undefined,
      experienceYears: typeof t.experienceYears === 'number' ? t.experienceYears : undefined,
      address:
        t.address !== undefined && String(t.address).trim() !== ''
          ? String(t.address).trim()
          : undefined,
      schoolId: params.schoolId,
      history: []
    }));

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      await Teacher.insertMany(preparedDocs, { session: mongoSession });
      await mongoSession.commitTransaction();
      return {
        success: true,
        successCount: preparedDocs.length,
        message: 'Teachers uploaded successfully'
      };
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  }

  /* 
     ASSIGN CLASS (Principal)
 */
  static async assignClass(
    schoolId: Types.ObjectId,
    data: {
      teacherId: string;
      //  teacherId: Types.ObjectId;
      sessionId: Types.ObjectId;
      classId: Types.ObjectId;
      className: string;
      section: string;

    }
  ) {
    const teacher = await Teacher.findOne({
      _id: data.teacherId,
      schoolId,
      isActive: true
    });

    if (!teacher) throw new Error('Teacher not found');

    const classDoc = await Class.findOne({
      _id: data.classId,
      schoolId,
      sessionId: data.sessionId
    });

    if (!classDoc) throw new Error('Class not found');

    /* 
       REMOVE TEACHER FROM PREVIOUS CLASS (SAME SESSION)
   */
    await Class.updateMany(
      {
        teacherId: teacher._id,
        sessionId: data.sessionId
      },
      { $unset: { teacherId: 1 } }
    );

    /* 
       ASSIGN TEACHER TO NEW CLASS  
     */
    classDoc.teacherId = teacher._id;
    await classDoc.save();

    teacher.history.forEach(h => {
      if (h.sessionId.toString() === data.sessionId.toString()) {
        h.isActive = false;
      }
    });

    teacher.history.push({
      sessionId: data.sessionId,
      classId: data.classId,
      className: data.className,
      section: data.section,
      isActive: true
    });

    await teacher.save();

    return {
      message: 'class assigned to teacher successfully'
    };
  }

  /* 
     TEACHER: GET OWN PROFILE
  */
  static async getMyProfile(teacherId: string) {
    return Teacher.findById(teacherId).select('-password');
  }

  /*
     TEACHER: UPDATE OWN PROFILE
  */
  static async updateMyProfile(
    teacherId: string,
    data: {
      name?: string;
      phone?: string;
      dob?: Date;
      gender?: 'male' | 'female' | 'other';
      highestQualification?: string;
      experienceYears?: number;
      address?: string;
      password?: string;
    }
  ) {
    const teacher = await Teacher.findById(teacherId).select('+password');
    if (!teacher) throw new Error('Teacher not found');

    if (data.name) teacher.name = data.name;
    if (data.phone) teacher.phone = data.phone;
    if (data.dob) teacher.dob = data.dob;
    if (data.gender) teacher.gender = data.gender;
    if (data.highestQualification)
      teacher.highestQualification = data.highestQualification;
    if (typeof data.experienceYears === 'number')
      teacher.experienceYears = data.experienceYears;
    if (data.address) teacher.address = data.address;

    return teacher.save();
  }

  /* 
     PRINCIPAL: LIST TEACHERS
  */
  static async listTeachers(schoolId: Types.ObjectId) {
    return Teacher.find({ schoolId, isActive: true }).select('-password');
  }

  /* 
     PRINCIPAL: UPDATE TEACHER
  */
  static async updateTeacher(
    schoolId: Types.ObjectId,
    teacherId: string,
    data: any
  ) {
    const teacher = await Teacher.findOne({
      _id: teacherId,
      schoolId
    }).select('+password');

    if (!teacher) throw new Error('Teacher not found');

    const calcAgeYears = (dob: Date) => {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
      }
      return age;
    };

    const finalDob: Date | undefined =
      data?.dob !== undefined ? new Date(data.dob) : (teacher as any).dob;
    const finalExp: number | undefined =
      data?.experienceYears !== undefined
        ? Number(data.experienceYears)
        : (teacher as any).experienceYears;

    if (finalDob instanceof Date && !isNaN(finalDob.getTime()) && finalExp !== undefined) {
      const age = calcAgeYears(finalDob);
      if (finalExp > age) {
        throw new Error('Experience years cannot be greater than age');
      }
      if (age - finalExp < 14) {
        throw new Error('DOB and experience years difference must be at least 14 years');
      }
    }

    Object.assign(teacher, data);
    return teacher.save();
  }

  /* 
     PRINCIPAL: DELETE TEACHER (SOFT DEACTIVATE)
  */
  static async deleteTeacher(
    schoolId: Types.ObjectId,
    teacherId: string
  ) {
    const teacher = await Teacher.findOne({
      _id: teacherId,
      schoolId
    });

    if (!teacher) throw new Error('Teacher not found');

    await Class.updateMany(
      { teacherId: teacher._id },
      { $unset: { teacherId: 1 } }
    );

    teacher.history.forEach(h => (h.isActive = false));
    teacher.isActive = false;
    teacher.leftAt = new Date();

    await teacher.save();

    return { message: 'Teacher removed successfully' };
  }

  /* ======================================================
     TEACHER: CHANGE OWN PASSWORD
  ====================================================== */
  static async changeMyPassword(
    teacherId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const teacher = await Teacher.findById(teacherId).select('+password');
    if (!teacher) throw new Error('Teacher not found');

    const isMatch = await teacher.comparePassword(oldPassword);
    if (!isMatch) {
      throw new Error('Old password is incorrect');
    }

    teacher.password = newPassword;
    await teacher.save();

    return { message: 'Password changed successfully' };
  }

  /* ======================================================
     PRINCIPAL DASHBOARD
     TOTAL ACTIVE TEACHERS (SCHOOL WISE)
  ====================================================== */
  static async countActiveTeachers(schoolId: Types.ObjectId) {
    return Teacher.countDocuments({ schoolId, isActive: true });
  }

  /* ======================================================
       SWAP TEACHERS BETWEEN TWO CLASSES
    ====================================================== */
  static async swapTeacherClasses(
    schoolId: Types.ObjectId,
    data: {
      sessionId: Types.ObjectId;

      teacherAId: string;
      classAId: Types.ObjectId;
      classAName: string;
      sectionA: string;

      teacherBId: string;
      classBId: Types.ObjectId;
      classBName: string;
      sectionB: string;
    }
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const teacherA = await Teacher.findOne({
        _id: data.teacherAId,
        schoolId,
        isActive: true
      }).session(session);

      const teacherB = await Teacher.findOne({
        _id: data.teacherBId,
        schoolId,
        isActive: true
      }).session(session);

      if (!teacherA || !teacherB) {
        throw new Error('Both teachers must be active');
      }

      /* 1️⃣ REMOVE BOTH TEACHERS FROM THEIR CLASSES */
      await Class.updateMany(
        { _id: { $in: [data.classAId, data.classBId] } },
        { $unset: { teacherId: 1 } },
        { session }
      );

      /* 2️⃣ ASSIGN SWAPPED TEACHERS */
      await Class.findByIdAndUpdate(
        data.classAId,
        { teacherId: teacherB._id },
        { session }
      );

      await Class.findByIdAndUpdate(
        data.classBId,
        { teacherId: teacherA._id },
        { session }
      );

      /* 3️⃣ UPDATE TEACHER A HISTORY */
      teacherA.history.forEach(h => {
        if (h.sessionId.toString() === data.sessionId.toString()) {
          h.isActive = false;
        }
      });

      teacherA.history.push({
        sessionId: data.sessionId,
        classId: data.classBId,
        className: data.classBName,
        section: data.sectionB,
        isActive: true
      });

      /* 4️⃣ UPDATE TEACHER B HISTORY */
      teacherB.history.forEach(h => {
        if (h.sessionId.toString() === data.sessionId.toString()) {
          h.isActive = false;
        }
      });

      teacherB.history.push({
        sessionId: data.sessionId,
        classId: data.classAId,
        className: data.classAName,
        section: data.sectionA,
        isActive: true
      });

      await teacherA.save({ session });
      await teacherB.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { message: 'Teachers swapped successfully' };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw error;
    }
  }


  /* ======================================================
   TEACHER / PRINCIPAL
   GET FULL TEACHER PROFILE (ALL DB DETAILS)
====================================================== */
  static async getTeacherFullProfile(teacherId: string) {
    const teacher = await Teacher.findById(teacherId)
      .select('-password') // never expose password
      .populate({
        path: 'schoolId',
        select: 'name'
      })
      .populate({
        path: 'history.sessionId',
        select: 'name'
      })
      .populate({
        path: 'history.classId',
        select: 'name section'
      })
      .lean();

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    return teacher;
  }

  /* ======================================================
   TEACHER / PRINCIPAL
   UPDATE TEACHER PROFILE
====================================================== */
static async updateTeacherProfile(
  params: {
    schoolId: Types.ObjectId;
    requesterRole: UserRole;
    requesterId: string;
    teacherId?: string;
  },
  data: {
    name?: string;
    phone?: string;
    email?: string;
  }
) {
  let teacherIdToUpdate: string;

  if (params.requesterRole === 'teacher') {
    teacherIdToUpdate = params.requesterId;
  } else if (params.requesterRole === 'principal') {
    if (!params.teacherId) {
      throw new Error('Teacher ID is required');
    }
    teacherIdToUpdate = params.teacherId;
  } else {
    // admin / coordinator / student
    throw new Error('You are not allowed to update teacher profile');
  }

  const teacher = await Teacher.findOne({
    _id: teacherIdToUpdate,
    schoolId: params.schoolId
  });

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (data.name !== undefined) teacher.name = data.name;
  if (data.phone !== undefined) teacher.phone = data.phone;
  if (data.email !== undefined) teacher.email = data.email;

  await teacher.save();

  return teacher.toObject({ versionKey: false });
}



}