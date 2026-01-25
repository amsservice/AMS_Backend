
import { Types } from 'mongoose';
import { Session } from '../models/Session';
import { Staff } from '../models/Staff';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { Holiday } from '../models/Holiday';

export class SessionService {
  static async getSessionDeleteStatus(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ) {
    const hasClasses = await Class.exists({ schoolId, sessionId });
    const hasHolidays = await Holiday.exists({ schoolId, sessionId });
    const hasTeacherHistory = await Staff.exists({
      schoolId,
      'history.sessionId': sessionId
    });
    const hasStudentHistory = await Student.exists({
      schoolId,
      'history.sessionId': sessionId
    });

    const hasAssociatedData = Boolean(
      hasClasses || hasHolidays || hasTeacherHistory || hasStudentHistory
    );

    return {
      canDelete: !hasAssociatedData,
      hasAssociatedData
    };
  }

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

    if (endDate.getTime() < startDate.getTime()) {
      throw new Error('End date cannot be smaller than start date');
    }

    const diffDays =
      (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays > 730) {
      throw new Error('Session duration cannot be more than 730 days');
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
     - Edit name / dates
     - Toggle isActive
  ========================= */
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
    const session = await Session.findOne({
      _id: sessionId,
      schoolId
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (typeof data.name === 'string') {
      session.name = data.name;
    }

    const nextStartDate = data.startDate ? new Date(data.startDate) : session.startDate;
    const nextEndDate = data.endDate ? new Date(data.endDate) : session.endDate;

    if (data.startDate || data.endDate) {
      if (nextEndDate.getTime() < nextStartDate.getTime()) {
        throw new Error('End date cannot be smaller than start date');
      }

      const diffDays =
        (nextEndDate.getTime() - nextStartDate.getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays > 730) {
        throw new Error('Session duration cannot be more than 730 days');
      }

      session.startDate = nextStartDate;
      session.endDate = nextEndDate;
    }

    if (data.isActive === true) {
      // 🔄 Deactivate all others
      await Session.updateMany(
        { schoolId },
        { isActive: false }
      );
      
  /// 1️⃣ Deactivate ALL teacher histories (global reset)
await Staff.updateMany(
  { schoolId },
  { $set: { 'history.$[].isActive': false } }
);

   // 3️⃣ Restore teacher history for THIS session 🔥 FIX
    await Staff.updateMany(
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
    const teacher = await Staff.findById(teacherId);
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

    const status = await this.getSessionDeleteStatus(schoolId, sessionId);
    if (!status.canDelete) {
      throw new Error('Cannot delete session because data is associated with it');
    }

    await session.deleteOne();
    return true;
  }
}
