import mongoose from 'mongoose';
import { School } from '../models/School';
import { Principal } from '../models/Principal';
import {Teacher} from '../models/Teacher';
import { Student } from '../models/Student';

import { signJwt } from '../utils/jwt';

export class AuthService {
  static async registerSchool(data: any) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const school = await School.create(
        [{ name: data.schoolName, email: data.schoolEmail }],
        { session }
      );

      const principal = await Principal.create(
        [{
          name: data.principalName,
          email: data.principalEmail,
          password: data.principalPassword,
          schoolId: school[0]._id
        }],
        { session }
      );

   

      school[0].principalId = principal[0]._id;

      await school[0].save({ session });

      await session.commitTransaction();

      return {
        token: signJwt({
          userId: principal[0]._id.toString(),
          role: 'principal',
          schoolId: school[0]._id.toString()
        })
      };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }



   /* ======================================================
     PRINCIPAL LOGIN
  ====================================================== */
  static async loginPrincipal(email: string, password: string) {
    const principal = await Principal.findOne({ email }).select('+password');

    if (!principal) {
      throw new Error('Invalid email or password');
    }

    //  use schema method
    const isMatch = await principal.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return {
      token: signJwt({
        userId: principal._id.toString(),
        role: 'principal',
        schoolId: principal.schoolId.toString()
      })
    };
  }


   /* ======================================================
     UPDATE PRINCIPAL PROFILE
  ====================================================== */
  static async updatePrincipal(
    principalId: string,
    data: { name?: string; password?: string }
  ) {
    const principal = await Principal.findById(principalId).select('+password');

    if (!principal) {
      throw new Error('Principal not found');
    }

    if (data.name) {
      principal.name = data.name;
    }

    if (data.password) {
      //  hashing handled by schema hook
      principal.password = data.password;
    }

    await principal.save();

    return { message: 'Profile updated successfully' };
  }


  /* ======================================================
   GET PRINCIPAL PROFILE
====================================================== */
static async getPrincipal(principalId: string) {
  const principal = await Principal.findById(principalId).select(
    'name email phone schoolId createdAt'
  );

  if (!principal) {
    throw new Error('Principal not found');
  }

  return principal;
}


/// teacher login

static async loginTeacher(email: string, password: string) {
  const teacher = await Teacher.findOne({ email }).select('+password');

  if (!teacher) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await teacher.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return {
    token: signJwt({
      userId: teacher._id.toString(),
      role: 'teacher',
      schoolId: teacher.schoolId.toString()
    })
  };
}

///student login

static async loginStudent(email: string, password: string) {
  const student = await Student.findOne({ email }).select('+password');

  if (!student) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await student.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return {
    token: signJwt({
      userId: student._id.toString(),
      role: 'student',
      schoolId: student.schoolId.toString()
    })
  };
}


  /*
     LOGOUT (STATELESS JWT)
  */
 static async logout() {
   
    return {
      message: 'Logged out successfully'
    };
  }
}