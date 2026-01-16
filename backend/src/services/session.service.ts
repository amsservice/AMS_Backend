
import { Types } from 'mongoose';
import { Session } from '../models/Session';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';

export class SessionService {
  /* =========================
     CREATE SESSION
     - ALWAYS INACTIVE
     - EMPTY SESSION
  ========================= */
  static async createSession(
    schoolId: Types.ObjectId,
    data: {
      name: string;
      startDate: Date;
      endDate: Date;
    }
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    const diffDays =
      (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays > 365) {
      throw new Error('Session duration cannot be more than one year');
    }

    return Session.create({
      name: data.name,
      startDate,
      endDate,
      schoolId,
      isActive: false // ✅ always inactive
    });
  }

  /* =========================
     GET SESSIONS
  ========================= */
  static async getSessions(schoolId: Types.ObjectId) {
    return Session.find({ schoolId }).sort({ startDate: -1 });
  }

  /* =========================
     UPDATE SESSION
     - ONLY TOGGLE isActive
     - NO DATA COPY
  ========================= */
  static async updateSession(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId,
    data: { isActive?: boolean }
  ) {
    const session = await Session.findOne({
      _id: sessionId,
      schoolId
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (data.isActive === true) {
      // 🔄 Deactivate all others
      await Session.updateMany(
        { schoolId },
        { isActive: false }
      );
      
  /// 1️⃣ Deactivate ALL teacher histories (global reset)
await Teacher.updateMany(
  { schoolId },
  { $set: { 'history.$[].isActive': false } }
);

   // 3️⃣ Restore teacher history for THIS session 🔥 FIX
    await Teacher.updateMany(
      {
        schoolId,
        'history.sessionId': sessionId
      },
      {
        $set: { 'history.$[h].isActive': true }
      },
      {
        arrayFilters: [{ 'h.sessionId': sessionId }]
      }
    );

      session.isActive = true;
    }

    if (data.isActive === false) {
      session.isActive = false;
    }

    await session.save();
    return session;
  }

  /* =========================
     TEACHER SESSIONS (READ ONLY)
  ========================= */
  static async getSessionsForTeacher(teacherId: string) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const sessionIds = teacher.history.map(h => h.sessionId);
    return Session.find({ _id: { $in: sessionIds } });
  }

  /* =========================
     STUDENT SESSIONS (READ ONLY)
  ========================= */
  static async getSessionsForStudent(studentId: string) {
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    const sessionIds = student.history.map(h => h.sessionId);
    return Session.find({ _id: { $in: sessionIds } });
  }

  /* =========================
     DELETE SESSION
     - INACTIVE ONLY
  ========================= */
  static async deleteSession(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ) {
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.schoolId.equals(schoolId)) {
      throw new Error('Unauthorized access');
    }

    if (session.isActive) {
      throw new Error('Active session cannot be deleted');
    }

    await session.deleteOne();
    return true;
  }
}
