import { z } from 'zod';



// Login (Principal / Teacher / Student)
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6)
});

// School Registration (First-time onboarding)
export const registerSchoolSchema = z.object({
  schoolName: z.string().min(3),
  schoolEmail: z.email(),

  phone: z.string().min(10).max(15).optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),

  principalName: z.string().min(3),
  principalEmail: z.email(),
  principalPassword: z.string().min(6),

///for subscription
  // planId: z.enum(['1Y', '2Y', '3Y']),
  // enteredStudents: z.number().int().min(1),
  // futureStudents: z.number().int().min(0).optional(),
  // couponCode: z.string().optional(),

   /* ---------------- PAYMENT (MANDATORY) ---------------- */
  // orderId: z.string().min(5),
  // paymentId: z.string().min(5)
});

// Update school profile
export const updateSchoolSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().min(10).max(15).optional(),
  address: z.string().optional(),
  pincode: z.string().optional()
});


// Update principal profile (name/password)
export const updatePrincipalSchema = z.object({
  name: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  phone: z.string().min(10).max(15).optional(),
});


/* 
   SESSION (Academic Year)
*/


export const createSessionSchema = z.object({
  name: z.string().min(3),              // "2024-25"
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
});

export const updateSessionSchema = z.object({
  name: z.string().min(3).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional()
});


/* 
   CLASS
*/

export const createClassSchema = z.object({
  name: z.string().min(1),              // e.g. "10"
  section: z.string().min(1),           // e.g. "A"
  sessionId: z.string()
});


/* 
   TEACHER (PRINCIPAL ACTIONS)
 */

//  Create Teacher (Principal)
export const createTeacherSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional()
});

//  Update Teacher by Principal
export const updateTeacherSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional()
});

//  Assign Class to Teacher (Principal)
export const assignClassToTeacherSchema = z.object({
  sessionId: z.string().min(1, 'Session is required'),
  classId: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required')
});

/* 
   TEACHER (SELF ACTIONS)
 */

//  Teacher Update Own Profile
export const updateMyProfileSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional()
});


///student 

export const createStudentSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),

  admissionNo: z.string().min(1),
  fatherName: z.string().min(3),
  motherName: z.string().min(3),
  parentsPhone: z.string().min(10),

  rollNo: z.number().int().positive()
});

/* ======================================================
   UPDATE STUDENT (TEACHER)
====================================================== */
export const updateStudentSchema = z.object({
  name: z.string().min(3).optional(),
  fatherName: z.string().min(3).optional(),
  motherName: z.string().min(3).optional(),
  parentsPhone: z.string().min(10).optional(),
  rollNo: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive', 'left']).optional()
});

/* ======================================================
   CHANGE PASSWORD (STUDENT)
====================================================== */
export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

// for subscription
// export const couponEnum = z.enum(['FREE_3M', 'FREE_6M']);
// export const pricePreviewSchema = z.object({
//  planId: z.enum(['1Y', '2Y', '3Y']),
//   enteredStudents: z.number().min(1),
//   futureStudents: z.number().min(0),
//   couponCode: couponEnum.optional()
// });

// export const createPaymentSchema = pricePreviewSchema;




/* ======================================================
   ENUMS
====================================================== */

export const planEnum = z.enum(['1Y', '2Y', '3Y']);

export const couponEnum = z.enum(['FREE_3M', 'FREE_6M']);

/* ======================================================
   PRICE PREVIEW / PAYMENT INPUT
====================================================== */

export const pricePreviewSchema = z.object({
  planId: planEnum,

  // number of students entered by user
  enteredStudents: z.coerce.number().int().min(1),

  // students joining later (optional)
  futureStudents: z.coerce.number().int().min(0).optional(),

  // optional coupon
  couponCode: couponEnum.optional()
});

/*
  Payment creation uses EXACT SAME payload
  (Never trust frontend price — backend recalculates)
*/
export const createPaymentSchema = pricePreviewSchema;

/* ======================================================
   PAYMENT VERIFICATION
====================================================== */

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(10)
});


//renew subscription schema
export const renewSubscriptionSchema = z.object({
  body: z.object({
    schoolId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid schoolId'),

    orderId: z
      .string()
      .min(1, 'orderId is required'),

    paymentId: z
      .string()
      .min(1, 'paymentId is required')
  })


  
});




/* ======================================================
   VERIFY EMAIL OTP SCHEMA
====================================================== */
export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .regex(/@gmail\.com$/, {
      message: 'Only Gmail addresses are allowed'
    }),

  otp: z
    .string()
    .length(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^\d{6}$/, {
      message: 'OTP must contain only numbers'
    })
});

/* ===============================
   RESEND OTP
=============================== */
export const resendOtpSchema = z.object({
  email: z
    .string().
    email('Invalid email address')
});

export const deleteSessionSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});