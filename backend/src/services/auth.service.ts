import mongoose from 'mongoose';
import { School } from '../models/School';
import { Principal } from '../models/Principal';

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
}
