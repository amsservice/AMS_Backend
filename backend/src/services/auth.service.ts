import mongoose from "mongoose";
import dns from "dns/promises";

import { School } from "../models/School";
import { Principal } from "../models/Principal";
import { Teacher } from "../models/Teacher";
import { Student } from "../models/Student";
import { PaymentIntent } from "../models/PaymentIntent";
import { SubscriptionService } from "./subscription.service";
import { 
  signAccessToken, 
  signRefreshToken, 
  verifyRefreshToken,
  JwtPayload 
} from "../utils/jwt";
import { sendOtp } from "../utils/sendOtp";

/* ======================================================
   HELPERS
====================================================== */

// const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

// is-email-maybe -> library to validate email

// const blockedDomains = [
//   "mailinator.com",
//   "tempmail.com",
//   "10minutemail.com",
//   "yopmail.com",
// ];

// const verifyGmailMx = async (email: string) => {
//   const domain = email.split("@")[1];
//   const records = await dns.resolveMx(domain);
//   return records.some((r) => r.exchange.includes("google.com"));
// };

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ======================================================
   AUTH SERVICE
====================================================== */

export class AuthService {
  static async getSchoolPaymentStatus(schoolEmail: string) {
    const normalizedEmail = schoolEmail.toLowerCase().trim();

    const school = await School.findOne({ email: normalizedEmail })
      .select("email paymentId")
      .lean();

    if (!school) {
      const err: any = new Error("School not found");
      err.statusCode = 404;
      throw err;
    }

    return {
      email: school.email,
      paymentId: school.paymentId ?? null,
      hasPayment: Boolean(school.paymentId),
    };
  }

/* ======================================================
    REFRESH TOKEN LOGIC
====================================================== */
static async refreshAccessToken(refreshToken: string) {
  try {
    // 1️⃣ Verify using the REFRESH-specific function
    const payload = verifyRefreshToken(refreshToken);

    // 2️⃣ Check if user still exists/is active in DB
    let user;
    if (payload.role === "principal") user = await Principal.findById(payload.userId);
    else if (payload.role === "teacher") user = await Teacher.findById(payload.userId);
    else if (payload.role === "student") user = await Student.findById(payload.userId);

    if (!user) {
      throw new Error("User no longer exists");
    }

    // 3️⃣ Generate a fresh Access Token
    const newAccessToken = signAccessToken({
      userId: payload.userId,
      role: payload.role,
      schoolId: payload.schoolId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: signRefreshToken(payload)
    };
  } catch (error: any) {
    // Catch specific expiry error from our new utility
    const message = error.message === "Refresh token expired. Please login again." 
      ? error.message 
      : "Invalid session";
      
    const err: any = new Error(message);
    err.statusCode = 401;
    throw err;
  }
}

  /* ======================================================
     REGISTER SCHOOL (GMAIL + OTP ONLY)
  ====================================================== */
  static async registerSchool(data: any) {
    const {
      schoolName,
      schoolEmail,
      establishedYear,
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
      principalPhone,
      principalQualification,
      principalPassword,
      principalGender,
      principalExperience,
    } = data;

    const normalizedSchoolEmail = String(schoolEmail).toLowerCase().trim();
    const normalizedPrincipalEmail = String(principalEmail)
      .toLowerCase()
      .trim();

    // // 1️⃣ Gmail validation
    // if (!gmailRegex.test(normalizedSchoolEmail)) {
    //   throw new Error("Only Gmail addresses are allowed");
    // }

    // // 2️⃣ Temporary email block
    // const domain = normalizedSchoolEmail.split("@")[1];
    // if (blockedDomains.includes(domain)) {
    //   throw new Error("Temporary email addresses are not allowed");
    // }

    // // 3️⃣ Gmail MX check
    // if (!(await verifyGmailMx(normalizedSchoolEmail))) {
    //   throw new Error("Invalid Gmail domain");
    // }

    // 4️⃣ Duplicate school email
    const existingSchool = await School.findOne({
      email: normalizedSchoolEmail,
    });
    if (existingSchool) {
      if (!existingSchool.isEmailVerified) {
        return await this.updatePendingSchoolRegistration({
          schoolName,
          schoolEmail: normalizedSchoolEmail,
          establishedYear,
          phone,
          address,
          pincode,
          schoolType,
          board,
          city,
          district,
          state,
          principalName,
          principalEmail,
          principalPhone,
          principalQualification,
          principalPassword,
          principalGender,
          principalExperience,
        });
      }

      const err: any = new Error("School email already registered");
      err.statusCode = 409;
      err.data = {
        school: {
          email: existingSchool.email,
          paymentId: existingSchool.paymentId ?? null,
          isEmailVerified: existingSchool.isEmailVerified,
        },
      };
      throw err;
    }

    // 4️⃣b Duplicate principal email (already registered with another school)
    const existingPrincipal = await Principal.findOne({
      email: normalizedPrincipalEmail,
    })
      .select("_id email schoolId")
      .lean();

    if (existingPrincipal) {
      const err: any = new Error(
        "Principal email is already registered with a different school",
      );
      err.statusCode = 409;
      throw err;
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
            email: normalizedSchoolEmail,
            establishedYear,
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
            otpExpires: new Date(Date.now() + 10 * 60 * 1000),
          },
        ],
        { session },
      );

      /* ===============================
         CREATE PRINCIPAL
      =============================== */

      const [principal] = await Principal.create(
        [
          {
            name: principalName,
            email: normalizedPrincipalEmail,
            password: principalPassword,
            phone: principalPhone,
            qualification: principalQualification,
            gender: principalGender, // optional
            yearsOfExperience: principalExperience, // optional
            schoolId: school._id,
          },
        ],
        { session },
      );

      school.principalId = principal._id;
      await school.save({ session });

      await session.commitTransaction();

      await sendOtp(normalizedSchoolEmail, otp);

      return {
        message: "OTP sent to your email address. Please verify to continue.",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async updatePendingSchoolRegistration(data: any) {
    const {
      schoolName,
      schoolEmail,
      establishedYear,
      phone,
      address,
      pincode,
      schoolType,
      board,
      city,
      district,
      state,
      principalName,
      principalEmail,
      principalPhone,
      principalQualification,
      principalPassword,
      principalGender,
      principalExperience,
    } = data;

    const normalizedSchoolEmail = String(schoolEmail).toLowerCase().trim();
    const normalizedPrincipalEmail = String(principalEmail)
      .toLowerCase()
      .trim();

    const school = await School.findOne({ email: normalizedSchoolEmail });
    if (!school) {
      const err: any = new Error("School not found");
      err.statusCode = 404;
      throw err;
    }

    if (school.isEmailVerified && school.paymentId) {
      const err: any = new Error("School email already registered");
      err.statusCode = 409;
      err.data = {
        school: {
          email: school.email,
          paymentId: school.paymentId,
          isEmailVerified: school.isEmailVerified,
        },
      };
      throw err;
    }

    school.name = schoolName;
    school.establishedYear = establishedYear;
    school.phone = phone;
    school.address = address;
    school.pincode = pincode;
    school.schoolType = schoolType;
    school.board = board;
    school.city = city;
    school.district = district;
    school.state = state;

    if (school.principalId) {
      const principal = await Principal.findById(school.principalId).select(
        "+password",
      );
      if (principal) {
        const existingPrincipal = await Principal.findOne({
          email: normalizedPrincipalEmail,
          _id: { $ne: principal._id },
        })
          .select("_id email schoolId")
          .lean();

        if (existingPrincipal) {
          const err: any = new Error(
            "Principal email is already registered with a different school",
          );
          err.statusCode = 409;
          throw err;
        }

        principal.name = principalName;
        principal.email = normalizedPrincipalEmail;
        principal.password = principalPassword;
        principal.phone = principalPhone;
        principal.qualification = principalQualification;
        principal.gender = principalGender;
        principal.yearsOfExperience = principalExperience;
        await principal.save();
      }
    }

    let otpSent = false;
    if (!school.isEmailVerified) {
      const otp = generateOtp();
      school.emailOtp = otp;
      school.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await sendOtp(normalizedSchoolEmail, otp);
      otpSent = true;
    }

    await school.save();

    return {
      message: otpSent
        ? "OTP sent to Gmail. Please verify email."
        : "School details updated",
      school: {
        email: school.email,
        paymentId: school.paymentId ?? null,
        isEmailVerified: school.isEmailVerified,
      },
    };
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
        status: "paid",
      }).session(session);

      if (!intent) {
        throw new Error("Invalid or unpaid payment");
      }

      /* 2️⃣ Fetch school */
      const school = await School.findOne({
        email: normalizedEmail,
      }).session(session);

      if (!school) {
        throw new Error("School not found for this email");
      }

      if (!school.isEmailVerified) {
        throw new Error("Email not verified");
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
          couponCode: intent.couponCode,
        },
        session,
      );

      /* 5️⃣ Attach subscription to school */
      school.subscriptionId = subscription._id;
      school.paymentId = intent.paymentId;
      await school.save({ session });

      /* 6️⃣ Mark intent as used */
      intent.status = "used";
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
   PRINCIPAL LOGIN (SCHOOL CODE + EMAIL + PASSWORD)
====================================================== */
  static async loginPrincipal(
    email: string,
    password: string,
    schoolCode: number,
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1️⃣ Find school by schoolCode
    const school = await School.findOne({
      schoolCode,
      isActive: true,
    });

    if (!school) {
      throw new Error("Invalid school code");
    }

    if (!school.isEmailVerified) {
      throw new Error("Please verify school email first");
    }

    if (!school.subscriptionId) {
      throw new Error("Subscription not active. Please complete payment.");
    }

    // 2️⃣ Find principal under this school
    const principal = await Principal.findOne({
      email: normalizedEmail,
      schoolId: school._id,
    }).select("+password");

    if (!principal) {
      throw new Error("Invalid email or password");
    }

    // 3️⃣ Password check
    const isMatch = await principal.comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    // 4️⃣ Issue JWT
    const payload: JwtPayload = {
      userId: principal._id.toString(),
      role: "principal",
      schoolId: school._id.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: principal._id,
        name: principal.name, // Ensure 'name' exists on your Principal model
        email: principal.email,
        role: "principal",
      },
    };
  }

  /* ======================================================
     TEACHER LOGIN (UNCHANGED)
  ====================================================== */

  static async loginTeacher(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1️⃣ Find teacher and include password for verification
    const teacher = await Teacher.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!teacher) throw new Error("Invalid email or password");

    // 2️⃣ Password check
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) throw new Error("Invalid email or password");

    // 3️⃣ Define the payload using the JwtPayload interface
    const payload: JwtPayload = {
      userId: teacher._id.toString(),
      role: "teacher",
      schoolId: teacher.schoolId.toString(),
    };

    // 4️⃣ Generate both tokens
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 5️⃣ Return tokens and basic user info
    return {
      accessToken,
      refreshToken,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
      },
    };
  }

  /* ======================================================
     STUDENT LOGIN (UNCHANGED)
  ====================================================== */
  static async loginStudent(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const student = await Student.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!student) throw new Error("Invalid email or password");

    const isMatch = await student.comparePassword(password);
    if (!isMatch) throw new Error("Invalid email or password");

    // 1️⃣ Prepare the payload
    const payload: JwtPayload = {
      userId: student._id.toString(),
      role: "student",
      schoolId: student.schoolId.toString(),
    };

    // 2️⃣ Generate both tokens
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 3️⃣ Return full package
    return {
      accessToken,
      refreshToken,
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: "student",
      },
    };
  }

  /* ======================================================
     UPDATE PRINCIPAL PROFILE
  ====================================================== */
  static async updatePrincipal(
    principalId: string,
    data: {
      name?: string;
      password?: string;
      phone?: string;
      qualification?: string;
      gender?: 'Male' | 'Female' | 'Other';
      yearsOfExperience?: number;
    },
  ) {
    const principal = await Principal.findById(principalId).select("+password");

    if (!principal) {
      throw new Error("Principal not found");
    }

    if (data.name) {
      principal.name = data.name;
    }

    if (data.password) {
      // password hashing handled by schema hook
      principal.password = data.password;
    }

    if (data.phone !== undefined) {
      principal.phone = data.phone;
    }

    if (data.qualification !== undefined) {
      principal.qualification = data.qualification;
    }

    if (data.gender !== undefined) {
      principal.gender = data.gender;
    }

    if (data.yearsOfExperience !== undefined) {
      principal.yearsOfExperience = data.yearsOfExperience;
    }

    await principal.save();

    return { message: "Profile updated successfully" };
  }

  /* ======================================================
     GET PRINCIPAL PROFILE
  ====================================================== */
  static async getPrincipal(principalId: string) {
    const principal = await Principal.findById(principalId).select(
      "name email phone schoolId createdAt",
    );

    if (!principal) {
      throw new Error("Principal not found");
    }

    return principal;
  }

  /* ======================================================
      VERIFY SCHOOL EMAIL OTP
   ====================================================== */
  static async verifySchoolOtp(email: string, otp: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1️⃣ Find school
    const school = await School.findOne({ email: normalizedEmail });
    if (!school) throw new Error("School not found");

    // 2️⃣ OTP Checks
    if (!school.emailOtp || !school.otpExpires)
      throw new Error("OTP not generated");
    if (school.otpExpires < new Date()) throw new Error("OTP expired");
    if (school.emailOtp !== otp) throw new Error("Invalid OTP");

    // 3️⃣ Verify School
    school.isEmailVerified = true;
    school.emailOtp = undefined;
    school.otpExpires = undefined;
    await school.save();

    // 4️⃣ Find the Principal to issue tokens
    // We need the principal because the JWT payload requires a userId
    const principal = await Principal.findOne({ schoolId: school._id });

    if (!principal) {
      throw new Error("Principal record not found for this school");
    }

    // 5️⃣ Generate Tokens
    const payload: JwtPayload = {
      userId: principal._id.toString(),
      role: "principal",
      schoolId: school._id.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Note: We aren't saving the refreshToken to the DB yet
    // until you provide your schema for the update!

    return {
      message: "Email verified successfully. Please proceed to payment.",
      accessToken,
      refreshToken,
      user: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        role: "principal",
      },
    };
  }

  /* ======================================================
   RESEND OTP (RATE LIMITED)
====================================================== */
static async resendSchoolOtp(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const school = await School.findOne({ email: normalizedEmail });

  if (!school) {
    throw new Error("School not found");
  }

  if (school.isEmailVerified) {
    throw new Error("Email already verified");
  }

  const now = new Date();

  // 1️⃣ Rate Limiting: 60-second cooldown
  if (
    school.lastOtpSentAt &&
    now.getTime() - school.lastOtpSentAt.getTime() < 60 * 1000
  ) {
    throw new Error("Please wait 60 seconds before resending OTP");
  }

  // 2️⃣ Rate Limiting: Max 5 OTPs per hour
  if (
    school.otpResendCount &&
    school.otpResendCount >= 5 &&
    school.lastOtpSentAt &&
    now.getTime() - school.lastOtpSentAt.getTime() < 60 * 60 * 1000
  ) {
    throw new Error("Too many OTP requests. Try again later.");
  }

  // 3️⃣ Generate new OTP (6 digits)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4️⃣ Update School Record
  school.emailOtp = otp;
  school.otpExpires = new Date(now.getTime() + 10 * 60 * 1000); // 10 min expiry
  school.lastOtpSentAt = now;
  
  // Reset count if an hour has passed, otherwise increment
  const oneHourAgo = now.getTime() - 60 * 60 * 1000;
  if (school.lastOtpSentAt && school.lastOtpSentAt.getTime() < oneHourAgo) {
    school.otpResendCount = 1;
  } else {
    school.otpResendCount = (school.otpResendCount || 0) + 1;
  }

  await school.save();

  // 5️⃣ Send the Email
  await sendOtp(school.email, otp);

  return {
    message: "A new OTP has been sent to your Gmail.",
  };
}
}
