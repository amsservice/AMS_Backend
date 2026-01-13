

import { Types } from 'mongoose';
import { Session } from '../models/Session';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';

export class SessionService {
  /* =========================
     PRINCIPAL
  ========================= */

  // CREATE SESSION (default INACTIVE)

static async createSession(schoolId: Types.ObjectId, data: any) {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInDays > 365) {
    throw new Error('Session duration cannot be more than one year');
  }

  await Session.updateMany(
    { schoolId, isActive: true },
    { isActive: false }
  );

  return Session.create({ ...data, schoolId, isActive: true });

}

  // GET ALL SESSIONS (Principal)
  static async getSessions(schoolId: Types.ObjectId) {
    return Session.find({ schoolId }).sort({ startDate: -1 });
  }

  // UPDATE SESSION (EDIT + ACTIVATE / DEACTIVATE)
  static async updateSession(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ) {
    const session = await Session.findOne({ _id: sessionId, schoolId });

    if (!session) {
      throw new Error('Session not found');
    }

    // ✅ Activate this session → deactivate all others
    if (data.isActive === true) {
      await Session.updateMany(
        { schoolId },
        { isActive: false }
      );
      session.isActive = true;
    }

    // ✅ Deactivate explicitly
    if (data.isActive === false) {
      session.isActive = false;
    }

    // ✅ Edit other fields
    if (data.name !== undefined) session.name = data.name;
    if (data.startDate !== undefined) session.startDate = data.startDate;
    if (data.endDate !== undefined) session.endDate = data.endDate;

    if (data.startDate && data.endDate) {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const oneYearLater = new Date(startDate);
  oneYearLater.setFullYear(startDate.getFullYear() + 1);

  if (endDate > oneYearLater) {
    throw new Error('Session duration cannot be more than one year');
  }
}

    await session.save();

    return session;
  }

  /* =========================
     TEACHER
  ========================= */
  static async getSessionsForTeacher(teacherId: string) {
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const sessionIds = teacher.history.map(h => h.sessionId);

    return Session.find({ _id: { $in: sessionIds } }).sort({
      startDate: -1
    });
  }

  /* =========================
     STUDENT
  ========================= */
  static async getSessionsForStudent(studentId: string) {
    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error('Student not found');
    }

    const sessionIds = student.history.map(h => h.sessionId);

    return Session.find({ _id: { $in: sessionIds } }).sort({
      startDate: -1
    });
  }
/* =========================
   DELETE (INACTIVE ONLY)
========================= */
static async deleteSession(
  schoolId: Types.ObjectId,
  sessionId: Types.ObjectId
) {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // ✅ Explicit school check (SAFE)
  if (!session.schoolId.equals(schoolId)) {
    throw new Error('Unauthorized access to this session');
  }

  // ❌ Block active session delete
  if (session.isActive) {
    throw new Error('Active session cannot be deleted');
  }

  // ✅ Delete only the session document
  await session.deleteOne();

  return true;
}
}