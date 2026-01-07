

// services/class.service.ts
import { Class } from '../models/Class';
import { Types } from 'mongoose';

interface CreateClassInput {
  name: string;
  section: string;
  schoolId: Types.ObjectId;
  sessionId: Types.ObjectId;
}
interface UpdateClassInput {
  name?: string;
  section?: string;
  teacherId?: Types.ObjectId | null;
}

export class ClassService {
  /**
   * Create a new class linked to school + active session
   */
  static async createClass(data: CreateClassInput) {
    return Class.create(data);
  }

  



  static async getClasses(
  schoolId: Types.ObjectId,
  sessionId: Types.ObjectId
) {
  

  const classes = await Class.find({ schoolId, sessionId })
    .populate('teacherId', 'name')
    .sort({ name: 1, section: 1 })
    .lean();

  return classes.map((cls: any) => ({
    id: cls._id.toString(),
    name: cls.name,
    section: cls.section,

    // ✅ REQUIRED FOR ASSIGN API
    sessionId: cls.sessionId.toString(),

    // optional but useful
    teacherId: cls.teacherId?._id
      ? cls.teacherId._id.toString()
      : null,

    teacher: cls.teacherId ? cls.teacherId.name : null,

    studentCount: 0
  }));


}


  /**
   * UPDATE CLASS (Edit class name / section / teacher)
   */
  static async updateClass(
    classId: Types.ObjectId,
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId,
    data: UpdateClassInput
   
  ) {
    return Class.findOneAndUpdate(
      {
        _id: classId,
        schoolId,
        sessionId
      },
      {
        $set:data
        
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  /**
   * DELETE CLASS
   */
  static async deleteClass(
    classId: Types.ObjectId,
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ) {
    return Class.findOneAndDelete({
      _id: classId,
      schoolId,
      sessionId
    });
  }


/* ===============================
     TOTAL CLASSES COUNT
     =============================== */
  static async getTotalClasses(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ): Promise<number> {
    return Class.countDocuments({
      schoolId,
      sessionId
    });
    
  }

}
