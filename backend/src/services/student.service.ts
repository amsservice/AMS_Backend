import { Types } from 'mongoose';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';

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
  // static async updateStudentByTeacher(
  //   teacherId: string,
  //   studentId: string,
  //   data: {
  //     name?: string;
  //     fatherName?: string;
  //     motherName?: string;
  //     parentsPhone?: string;
  //     rollNo?: number;
  //     status?: 'active' | 'inactive' | 'left';
  //   }
  // ) {
  //   // find teacher active class
  //   const teacher = await Teacher.findById(teacherId);
  //   if (!teacher) throw new Error('Teacher not found');

  //   const activeClass = teacher.history.find(h => h.isActive);
  //   if (!activeClass) throw new Error('Teacher has no active class');

  //   // ensure student belongs to teacher's class
  //   const student = await Student.findOne({
  //     _id: studentId,
  //     schoolId: teacher.schoolId,
  //     history: {
  //       $elemMatch: {
  //         classId: activeClass.classId,
  //         isActive: true
  //       }
  //     }
  //   });

  //   if (!student) {
  //     throw new Error('Student not found in your class');
  //   }

  //   Object.assign(student, data);
  //   await student.save();

  //   return { message: 'Student profile updated successfully' };
  // }

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
}
