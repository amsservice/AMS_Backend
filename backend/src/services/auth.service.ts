
import mongoose from 'mongoose';
import dns from 'dns/promises';

import { School } from '../models/School';
import { Principal } from '../models/Principal';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { PaymentIntent } from '../models/PaymentIntent';
import { SubscriptionService } from './subscription.service';
import { signJwt } from '../utils/jwt';
import { sendOtp } from '../utils/sendOtp';

/* ======================================================
   HELPERS
====================================================== */

const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

const blockedDomains = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com'
];

const verifyGmailMx = async (email: string) => {
  const domain = email.split('@')[1];
  const records = await dns.resolveMx(domain);
  return records.some(r => r.exchange.includes('google.com'));
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ======================================================
   AUTH SERVICE
====================================================== */

export class AuthService {

  /* ======================================================
     REGISTER SCHOOL (GMAIL + OTP ONLY)
  ====================================================== */
  static async registerSchool(data: any) {
    const {
      schoolName,
      schoolEmail,
      phone,
      address,
      pincode,
      schoolType,
      board,
      city,
      district,
      state,
      //principal
      principalName,
      principalEmail,
      principalPassword,
      principalGender,
      principalExperience
    } = data;

    // 1️⃣ Gmail validation
    if (!gmailRegex.test(schoolEmail)) {
      throw new Error('Only Gmail addresses are allowed');
    }

    // 2️⃣ Temporary email block
    const domain = schoolEmail.split('@')[1];
    if (blockedDomains.includes(domain)) {
      throw new Error('Temporary email addresses are not allowed');
    }

    // 3️⃣ Gmail MX check
    if (!(await verifyGmailMx(schoolEmail))) {
      throw new Error('Invalid Gmail domain');
    }

    // 4️⃣ Duplicate school email
    const existingSchool = await School.findOne({ email: schoolEmail });
    if (existingSchool) {
      throw new Error('School email already registered');
    }

    // 5️⃣ OTP
    const otp = generateOtp();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      /* ===============================
         CREATE SCHOOL (UNVERIFIED)
      =============================== */
      const [school] = await School.create(
        [
          {
            name: schoolName,
            email: schoolEmail,
            phone,
            address,
            pincode,
            schoolType,
            board,
            city,
            district,
            state,
            isEmailVerified: false,
            emailOtp: otp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000)
          }
        ],
        { session }
      );

      /* ===============================
         CREATE PRINCIPAL
      =============================== */

      const [principal] = await Principal.create(
        [
          {
            name: principalName,
            email: principalEmail,
            password: principalPassword,
            gender: principalGender, // optional
            yearsOfExperience: principalExperience, // optional
            schoolId: school._id
          }
        ],
        { session }
      );

      school.principalId = principal._id;
      await school.save({ session });

      await session.commitTransaction();

      await sendOtp(schoolEmail, otp);

      return {
        message: 'OTP sent to Gmail. Please verify email.'
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /* ======================================================
     VERIFY SCHOOL EMAIL OTP
  ====================================================== */
  static async activateSubscription(data: {
    orderId: string;
    paymentId: string;
    schoolEmail: string;
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const normalizedEmail = data.schoolEmail.toLowerCase().trim();

      /* 1️⃣ Fetch paid intent */
      const intent = await PaymentIntent.findOne({
        orderId: data.orderId,
        paymentId: data.paymentId,
        status: 'paid'
      }).session(session);

      if (!intent) {
        throw new Error('Invalid or unpaid payment');
      }

      /* 2️⃣ Fetch school */
      const school = await School.findOne({
        email: normalizedEmail
      }).session(session);

      if (!school) {
        throw new Error('School not found for this email');
      }

      if (!school.isEmailVerified) {
        throw new Error('Email not verified');
      }

      /* 3️⃣ Prevent duplicate subscription */
      if (school.subscriptionId) {
        await session.commitTransaction();
        return;
      }

      /* 4️⃣ Create subscription */
      const subscription = await SubscriptionService.createSubscription(
        {
          schoolId: school._id,
          planId: intent.planId,
          orderId: intent.orderId,
          paymentId: intent.paymentId!,
          enteredStudents: intent.enteredStudents,
          futureStudents: intent.futureStudents,
          couponCode: intent.couponCode
        },
        session
      );

      /* 5️⃣ Attach subscription to school */
      school.subscriptionId = subscription._id;
      await school.save({ session });

      /* 6️⃣ Mark intent as used */
      intent.status = 'used';
      await intent.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /* ======================================================
     PRINCIPAL LOGIN (OTP + SUBSCRIPTION REQUIRED)
  ====================================================== */
  // static async loginPrincipal(email: string, password: string) {
  //   // const principal = await Principal.findOne({ email }).select('+password');
  //   const normalizedEmail = email.toLowerCase().trim();

  //   const principal = await Principal
  //     .findOne({ email: normalizedEmail })
  //     .select('+password');
  //   if (!principal) {
  //     throw new Error('Invalid email or password');
  //   }

  //   const school = await School.findById(principal.schoolId);

  //   if (!school?.isEmailVerified) {
  //     throw new Error('Please verify email before login');
  //   }

  //   if (!school.subscriptionId) {
  //     throw new Error('Subscription not active. Please complete payment.');
  //   }

  //   const isMatch = await principal.comparePassword(password);
  //   if (!isMatch) {
  //     throw new Error('Invalid email or password');
  //   }

  //   return {
  //     accessToken: signJwt({
  //       userId: principal._id.toString(),
  //       role: 'principal',
  //       schoolId: school._id.toString()
  //     })
  //   };
  // }

  /* ======================================================
   PRINCIPAL LOGIN (SCHOOL CODE + EMAIL + PASSWORD)
====================================================== */
static async loginPrincipal(
  email: string,
  password: string,
  schoolCode: number
) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1️⃣ Find school by schoolCode
  const school = await School.findOne({
    schoolCode,
    isActive: true
  });

  if (!school) {
    throw new Error('Invalid school code');
  }

  if (!school.isEmailVerified) {
    throw new Error('Please verify school email first');
  }

  if (!school.subscriptionId) {
    throw new Error('Subscription not active. Please complete payment.');
  }

  // 2️⃣ Find principal under this school
  const principal = await Principal.findOne({
    email: normalizedEmail,
    schoolId: school._id
  }).select('+password');

  if (!principal) {
    throw new Error('Invalid email or password');
  }

  // 3️⃣ Password check
  const isMatch = await principal.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // 4️⃣ Issue JWT
  return {
    accessToken: signJwt({
      userId: principal._id.toString(),
      role: 'principal',
      schoolId: school._id.toString()
    })
  };
}


  /* ======================================================
     TEACHER LOGIN (UNCHANGED)
  ====================================================== */
  static async loginTeacher(email: string, password: string) {
    const teacher = await Teacher.findOne({ email }).select('+password');
    if (!teacher) throw new Error('Invalid email or password');

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) throw new Error('Invalid email or password');

    return {
      accessToken: signJwt({
        userId: teacher._id.toString(),
        role: 'teacher',
        schoolId: teacher.schoolId.toString()
      })
    };
  }

  /* ======================================================
     STUDENT LOGIN (UNCHANGED)
  ====================================================== */
  static async loginStudent(email: string, password: string) {
    const student = await Student.findOne({ email }).select('+password');
    if (!student) throw new Error('Invalid email or password');

    const isMatch = await student.comparePassword(password);
    if (!isMatch) throw new Error('Invalid email or password');

    return {
      accessToken: signJwt({
        userId: student._id.toString(),
        role: 'student',
        schoolId: student.schoolId.toString()
      })
    };
  }

  static async logout() {
    return { message: 'Logged out successfully' };
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
      // password hashing handled by schema hook
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


  /* ======================================================
      VERIFY SCHOOL EMAIL OTP
   ====================================================== */
  static async verifySchoolOtp(email: string, otp: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const school = await School.findOne({ email: normalizedEmail });

    if (!school) {
      throw new Error('School not found');
    }

    if (!school.emailOtp || !school.otpExpires) {
      throw new Error('OTP not generated');
    }

    if (school.otpExpires < new Date()) {
      throw new Error('OTP expired');
    }

    if (school.emailOtp !== otp) {
      throw new Error('Invalid OTP');
    }

    school.isEmailVerified = true;
    school.emailOtp = undefined;
    school.otpExpires = undefined;

    await school.save();

    return {
      message: 'Email verified successfully. Please proceed to payment.'
    };
  }

  /* ======================================================
   RESEND OTP (RATE LIMITED)
====================================================== */
  static async resendSchoolOtp(email: string) {
    const school = await School.findOne({
      email: email.toLowerCase().trim()
    });

    if (!school) {
      throw new Error('School not found');
    }

    if (school.isEmailVerified) {
      throw new Error('Email already verified');
    }

    const now = new Date();

    // ⏳ Cooldown: 60 seconds
    if (
      school.lastOtpSentAt &&
      now.getTime() - school.lastOtpSentAt.getTime() < 60 * 1000
    ) {
      throw new Error('Please wait 60 seconds before resending OTP');
    }

    // 🚫 Max 5 OTPs per hour
    if (
      school.otpResendCount &&
      school.otpResendCount >= 5 &&
      school.lastOtpSentAt &&
      now.getTime() - school.lastOtpSentAt.getTime() < 60 * 60 * 1000
    ) {
      throw new Error('Too many OTP requests. Try again later.');
    }

    // 🔢 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    school.emailOtp = otp;
    school.otpExpires = new Date(now.getTime() + 10 * 60 * 1000);
    school.lastOtpSentAt = now;
    school.otpResendCount = (school.otpResendCount || 0) + 1;

    await school.save();

    await sendOtp(school.email, otp);

    return {
      message: 'OTP resent successfully'
    };
  }

}





