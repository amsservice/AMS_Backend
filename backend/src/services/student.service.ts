import mongoose, { Types } from 'mongoose';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { Session } from '../models/Session';
import { Class } from '../models/Class';
import bcrypt from 'bcryptjs';

interface BulkStudentInput {
  name: string;
  email: string;
  password: string;
  admissionNo: string;
  fatherName: string;
  motherName: string;
  parentsPhone: string;
  rollNo: number;
}

interface BulkStudentWithClassInput extends BulkStudentInput {
  classId?: string;
  className?: string;
  section?: string;
}

export class StudentService {
  /* 
     TEACHER: ADD STUDENT TO OWN CLASS
   */
  static async createStudentByTeacher(
    teacherId: string,
    data: {
      name: string;
      email: string;
      password: string;
      admissionNo: string;
      fatherName: string;
      motherName: string;
      parentsPhone: string;
      rollNo: number;
    }
  ) {
    //  Find teacher + active class
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const activeClass = teacher.history.find(h => h.isActive);
    if (!activeClass) {
      throw new Error('Teacher has no active class assigned');
    }

    //  Create student
    const student = await Student.create({
      name: data.name,
      email: data.email,
      password: data.password, // hashed by schema
      admissionNo: data.admissionNo,
      fatherName: data.fatherName,
      motherName: data.motherName,
      parentsPhone: data.parentsPhone,
      schoolId: teacher.schoolId,
      history: [
        {
          sessionId: activeClass.sessionId,
          classId: activeClass.classId,
          className: activeClass.className,
          section: activeClass.section,
          rollNo: data.rollNo,
          isActive: true
        }
      ]
    });

    return {
      message: 'Student added successfully',
      studentId: student._id
    };
  }

  /* 
     STUDENT SERVICE
  */

  /* 
     TEACHER: UPDATE STUDENT PROFILE (NO PASSWORD)
   */
  static async updateStudentByTeacher(
    teacherId: string,
    studentId: string,
    data: {
      name?: string;
      fatherName?: string;
      motherName?: string;
      parentsPhone?: string;
      rollNo?: number;
      status?: 'active' | 'inactive' | 'left';
    }
  ) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const activeClass = teacher.history.find(h => h.isActive);
    if (!activeClass) throw new Error('Teacher has no active class');

    const updatePayload: any = {
      ...(data.name && { name: data.name }),
      ...(data.fatherName && { fatherName: data.fatherName }),
      ...(data.motherName && { motherName: data.motherName }),
      ...(data.parentsPhone && { parentsPhone: data.parentsPhone })
    };

    // rollNo lives inside history[]
    if (data.rollNo !== undefined) {
      updatePayload['history.$.rollNo'] = data.rollNo;
    }

    if (data.status) {
      updatePayload['history.$.status'] = data.status;
    }

    const updated = await Student.findOneAndUpdate(
      {
        _id: studentId,
        schoolId: teacher.schoolId,
        history: {
          $elemMatch: {
            classId: activeClass.classId,
            isActive: true
          }
        }
      },
      {
        $set: updatePayload
      },
      {
        new: true
      }
    ).select('-password');

    if (!updated) {
      throw new Error('Student not found in your class');
    }

    return { message: 'Student profile updated successfully' };
  }

  /* 
     STUDENT: CHANGE OWN PASSWORD
   */
  static async changeMyPassword(
    studentId: string,
    oldPassword: string,
    newPassword: string
  ) {
    const student = await Student.findById(studentId).select('+password');
    if (!student) throw new Error('Student not found');

    const isMatch = await student.comparePassword(oldPassword);
    if (!isMatch) throw new Error('Old password is incorrect');

    student.password = newPassword; // hashed by schema hook
    await student.save();

    return { message: 'Password changed successfully' };
  }

  /* 
     STUDENT: GET OWN PROFILE
   */
  static async getMyProfile(studentId: string) {
    return Student.findById(studentId).select('-password');
  }

  /* =====================================================
    PRINCIPAL: TOTAL STUDENTS CLASS WISE
 ===================================================== */
  static async getTotalStudentsClassWise(
    schoolId: Types.ObjectId,
    sessionId: Types.ObjectId
  ) {
    return Student.aggregate([
      { $unwind: '$history' },
      {
        $match: {
          schoolId,
          'history.sessionId': sessionId,
          'history.isActive': true
        }
      },
      {
        $group: {
          _id: {
            classId: '$history.classId',
            className: '$history.className',
            section: '$history.section'
          },
          totalStudents: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          classId: '$_id.classId',
          className: '$_id.className',
          section: '$_id.section',
          totalStudents: 1
        }
      },
      { $sort: { className: 1, section: 1 } }
    ]);
  }

  /* =====================================================
     TEACHER: STUDENTS OF MY ACTIVE CLASS
  ===================================================== */
  static async getMyStudents(teacherId: string) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const activeClass = teacher.history.find(h => h.isActive);
    if (!activeClass) throw new Error('Teacher has no active class');

    return Student.find({
      schoolId: teacher.schoolId,
      history: {
        $elemMatch: {
          classId: activeClass.classId,
          sessionId: activeClass.sessionId,
          isActive: true
        }
      }
    })
      .select('-password')
      .sort({ 'history.rollNo': 1 });
  }

  /* =====================================================
     PRINCIPAL: STUDENTS OF SCHOOL (ACTIVE SESSION)
  ===================================================== */
  static async getSchoolStudents(schoolId: string) {
    const schoolObjectId = new Types.ObjectId(schoolId);

    const activeSession = await Session.findOne({
      schoolId: schoolObjectId,
      isActive: true
    });

    if (!activeSession) {
      return [];
    }

    return Student.find({
      schoolId: schoolObjectId,
      history: {
        $elemMatch: {
          sessionId: activeSession._id,
          isActive: true
        }
      }
    })
      .select('-password')
      .sort({ name: 1 });
  }

  /* =====================================================
    BULK CREATE STUDENTS (TEACHER / PRINCIPAL)
 ===================================================== */
  static async bulkCreateStudents(
    params: {
      role: 'teacher' | 'principal';
      userId: string;
      schoolId: Types.ObjectId;
      classId?: Types.ObjectId;
      className?: string;
      section?: string;
    },
    students: BulkStudentInput[]
  ) {
    if (!students.length) {
      throw new Error('No students provided');
    }

    /* -----------------------------
       Resolve Class & Session
    ------------------------------ */
    let sessionId: Types.ObjectId;
    let classId: Types.ObjectId;
    let className: string;
    let section: string;

    if (params.role === 'teacher') {
      const teacher = await Teacher.findById(params.userId);
      if (!teacher) throw new Error('Teacher not found');

      const activeClass = teacher.history.find(h => h.isActive);
      if (!activeClass) throw new Error('Teacher has no active class');

      sessionId = activeClass.sessionId;
      classId = activeClass.classId;
      className = activeClass.className;
      section = activeClass.section;
    } else {
      if (!params.classId || !params.className || !params.section) {
        throw new Error('classId, className and section are required');
      }

      const activeSession = await Session.findOne({
        schoolId: params.schoolId,
        isActive: true
      });

      if (!activeSession) {
        throw new Error('No active session found');
      }

      sessionId = activeSession._id;
      classId = params.classId;
      className = params.className;
      section = params.section;
    }

    /* -----------------------------
       CSV-Level Validation
    ------------------------------ */
    const seenAdmissionNos = new Set<string>();
    const validationErrors: { row: number; message: string }[] = [];

    students.forEach((s, index) => {
      if (
        !s.name ||
        !s.email ||
        !s.password ||
        !s.admissionNo ||
        !s.fatherName ||
        !s.motherName ||
        !s.parentsPhone ||
        s.rollNo === undefined
      ) {
        validationErrors.push({
          row: index + 1,
          message: 'Missing required fields'
        });
      }

      if (seenAdmissionNos.has(s.admissionNo)) {
        validationErrors.push({
          row: index + 1,
          message: 'Duplicate admissionNo in CSV'
        });
      }

      seenAdmissionNos.add(s.admissionNo);
    });

    if (validationErrors.length) {
      return {
        success: false,
        validationErrors
      };
    }

    /* -----------------------------
       Hash passwords (IMPORTANT)
    ------------------------------ */
    const preparedDocs = students.map(s => ({
      name: s.name.trim(),
      email: s.email.trim().toLowerCase(),
      password: s.password, // let schema hash it
      admissionNo: s.admissionNo.trim(),
      fatherName: s.fatherName.trim(),
      motherName: s.motherName.trim(),
      parentsPhone: s.parentsPhone.trim(),
      schoolId: params.schoolId,
      history: [
        {
          sessionId,
          classId,
          className,
          section,
          rollNo: s.rollNo,
          isActive: true
        }
      ]
    }));

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      await Student.insertMany(preparedDocs, {
        session: mongoSession
      });

      await mongoSession.commitTransaction();
      return {
        success: true,
        successCount: students.length,
        message: 'Students uploaded successfully'
      };
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  }

  /* =====================================================
     PRINCIPAL: BULK CREATE STUDENTS (WHOLE SCHOOL)
     CSV rows include classId OR (className + section)
  ===================================================== */
  static async bulkCreateStudentsSchoolWide(
    params: {
      schoolId: Types.ObjectId;
    },
    students: BulkStudentWithClassInput[]
  ) {
    if (!students.length) {
      throw new Error('No students provided');
    }

    const activeSession = await Session.findOne({
      schoolId: params.schoolId,
      isActive: true
    });

    if (!activeSession) {
      throw new Error('No active session found');
    }

    const sessionId = activeSession._id;

    const classes = await Class.find({
      schoolId: params.schoolId,
      sessionId
    })
      .select('_id name section')
      .lean();

    const classById = new Map<
      string,
      { _id: Types.ObjectId; name: string; section: string }
    >();
    const classByKey = new Map<
      string,
      { _id: Types.ObjectId; name: string; section: string }
    >();

    classes.forEach((c: any) => {
      const id = c._id.toString();
      classById.set(id, { _id: c._id, name: c.name, section: c.section });

      const key = `${String(c.name).trim().toLowerCase()}__${String(c.section)
        .trim()
        .toLowerCase()}`;
      classByKey.set(key, { _id: c._id, name: c.name, section: c.section });
    });

    const seenAdmissionNos = new Set<string>();
    const validationErrors: { row: number; message: string }[] = [];

    students.forEach((s, index) => {
      if (
        !s.name ||
        !s.email ||
        !s.password ||
        !s.admissionNo ||
        !s.fatherName ||
        !s.motherName ||
        !s.parentsPhone ||
        s.rollNo === undefined
      ) {
        validationErrors.push({
          row: index + 1,
          message: 'Missing required fields'
        });
      }

      const hasClassId = Boolean(s.classId && String(s.classId).trim());
      const hasClassAndSection = Boolean(
        s.className &&
          String(s.className).trim() &&
          s.section &&
          String(s.section).trim()
      );

      if (!hasClassId && !hasClassAndSection) {
        validationErrors.push({
          row: index + 1,
          message: 'classId or (className and section) are required'
        });
      }

      if (seenAdmissionNos.has(s.admissionNo)) {
        validationErrors.push({
          row: index + 1,
          message: 'Duplicate admissionNo in CSV'
        });
      }

      seenAdmissionNos.add(s.admissionNo);
    });

    if (validationErrors.length) {
      return {
        success: false,
        validationErrors
      };
    }

    const preparedDocs: any[] = [];
    const mappingErrors: { row: number; message: string }[] = [];

    students.forEach((s, index) => {
      let resolvedClass:
        | { _id: Types.ObjectId; name: string; section: string }
        | undefined;

      if (s.classId) {
        resolvedClass = classById.get(String(s.classId).trim());
      }

      if (!resolvedClass) {
        const key = `${String(s.className || '').trim().toLowerCase()}__${String(
          s.section || ''
        )
          .trim()
          .toLowerCase()}`;
        resolvedClass = classByKey.get(key);
      }

      if (!resolvedClass) {
        mappingErrors.push({
          row: index + 1,
          message: 'Invalid class mapping (classId/className+section not found)'
        });
        return;
      }

      preparedDocs.push({
        name: s.name.trim(),
        email: s.email.trim().toLowerCase(),
        password: s.password,
        admissionNo: s.admissionNo.trim(),
        fatherName: s.fatherName.trim(),
        motherName: s.motherName.trim(),
        parentsPhone: s.parentsPhone.trim(),
        schoolId: params.schoolId,
        history: [
          {
            sessionId,
            classId: resolvedClass._id,
            className: resolvedClass.name,
            section: resolvedClass.section,
            rollNo: s.rollNo,
            isActive: true
          }
        ]
      });
    });

    if (mappingErrors.length) {
      return {
        success: false,
        validationErrors: mappingErrors
      };
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      await Student.insertMany(preparedDocs, {
        session: mongoSession
      });

      await mongoSession.commitTransaction();
      return {
        success: true,
        successCount: preparedDocs.length,
        message: 'Students uploaded successfully'
      };
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  }

  //create student by principal

  static async createStudentByPrincipal(
    schoolId: string,
    data: {
      name: string;
      email?: string;
      password: string;
      admissionNo: string;
      fatherName: string;
      motherName: string;
      parentsPhone: string;
      rollNo: number;
      classId: string;
      className: string;
      section: string;
    }
  ) {
    const schoolObjectId = new Types.ObjectId(schoolId);
    const classObjectId = new Types.ObjectId(data.classId);

    const activeSession = await Session.findOne({
      schoolId: schoolObjectId,
      isActive: true
    });

    if (!activeSession) {
      throw new Error('No active session found');
    }

    const student = await Student.create({
      name: data.name.trim(),
      email: data.email?.trim().toLowerCase(),
      password: data.password, // 🔥 schema will hash
      admissionNo: data.admissionNo.trim(),
      fatherName: data.fatherName.trim(),
      motherName: data.motherName.trim(),
      parentsPhone: data.parentsPhone.trim(),
      schoolId: schoolObjectId,
      history: [
        {
          sessionId: activeSession._id,
          classId: classObjectId,
          className: data.className,
          section: data.section,
          rollNo: data.rollNo,
          isActive: true
        }
      ]
    });

    return {
      message: 'Student added successfully',
      studentId: student._id.toString()
    };
  }
}