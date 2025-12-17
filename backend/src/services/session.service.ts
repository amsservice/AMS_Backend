import { Types } from 'mongoose';
import { Session } from '../models/Session';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';

export class SessionService {
  /* ===============================
     PRINCIPAL
  =============================== */
  static async createSession(schoolId: Types.ObjectId, data: any) {
    await Session.updateMany(
      { schoolId, isActive: true },
      { isActive: false }
    );

    return Session.create({ ...data, schoolId, isActive: true });
  }

  static async getSessions(schoolId: Types.ObjectId) {
    return Session.find({ schoolId }).sort({ startDate: -1 });
  }

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

    if (data.isActive === true) {
      await Session.updateMany(
        { schoolId, isActive: true },
        { isActive: false }
      );
    }

    Object.assign(session, data);
    await session.save();

    return session;
  }

  /* ===============================
     TEACHER
  =============================== */
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

  /* ===============================
     STUDENT
  =============================== */
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
}
