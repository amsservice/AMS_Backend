import { Types } from 'mongoose';
import { Teacher } from '../models/Teacher';
import {Class} from "../models/Class";

export class TeacherService {
  /* 
     CREATE TEACHER (Principal)
   */
  static async createTeacher(
    schoolId: Types.ObjectId,
    data: { name: string; email: string; password: string }
  ) {
    return Teacher.create({ ...data, schoolId, history: [] });
  }

  /* 
     ASSIGN CLASS (Principal)
 */
  static async assignClass(
    schoolId: Types.ObjectId,
    data: {
      teacherId: string;
      sessionId: Types.ObjectId;
      classId: Types.ObjectId;
      className:string;
      section: string;
      
    }
  ) {
    const teacher = await Teacher.findOne({
      _id: data.teacherId,
      schoolId
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
      className:data.className,
      section: data.section,
       isActive: true
    });

    await teacher.save();

    return{
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
    data: { name?: string; phone?: string; password?: string }
  ) {
    const teacher = await Teacher.findById(teacherId).select('+password');
    if (!teacher) throw new Error('Teacher not found');

    if (data.name) teacher.name = data.name;
    if (data.phone) teacher.phone = data.phone;
    if (data.password) teacher.password = data.password; // hashed by schema

    return teacher.save();
  }

  /* 
     PRINCIPAL: LIST TEACHERS
  */
  static async listTeachers(schoolId: Types.ObjectId) {
    return Teacher.find({ schoolId }).select('-password');
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

    Object.assign(teacher, data);
    return teacher.save();
  }

  /* 
     PRINCIPAL: DELETE TEACHER
   */
  static async deleteTeacher(
    schoolId: Types.ObjectId,
    teacherId: string
  ) {
    const teacher = await Teacher.findOneAndDelete({
      _id: teacherId,
      schoolId
    });

    if (!teacher) throw new Error('Teacher not found');

    return { message: 'Teacher deleted successfully' };
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

  teacher.password = newPassword; // hashed by schema hook
  await teacher.save();

  return { message: 'Password changed successfully' };
}
}



