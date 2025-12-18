import { Class } from '../models/Class';
import { Types } from 'mongoose';

interface CreateClassInput {
  name: string;
  section: string;
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
}

export class ClassService {
  static async createClass(data: CreateClassInput) {
    return Class.create(data);
  }

  static async getClasses(
    schoolId: Types.ObjectId,
    sessionId?: Types.ObjectId
  ) {
    const query: any = { schoolId };
    if (sessionId) query.sessionId = sessionId;

    return Class.find(query)
      .populate('teacherId', 'name email')
      .sort({ name: 1, section: 1 });
  }
  
}

