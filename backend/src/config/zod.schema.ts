import { z } from 'zod';

const calcAgeYears = (dob: Date) => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

// Login (Principal / Teacher / Student)
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  schoolCode: z.coerce.number()
});


// });

export const registerSchoolSchema = z.object({
  /* ===============================
     SCHOOL DETAILS
  =============================== */
  schoolName: z.string().min(3, 'School name must be at least 3 characters'),

  schoolEmail: z
    .string()
    .email('Invalid email format'),

  establishedYear: z
    .number()
    .int('Established year must be a valid year')
    .min(1900, 'Established year must be 1900 or later')
    .max(new Date().getFullYear(), 'Established year cannot be in the future'),

  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(12, 'Phone number must be at most 12 digits')
    .optional(),

  address: z
    .string()
    .min(10, 'Address must be at least 10 characters')
    .max(200, 'Address too long')
    .optional(),

  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional(),

  schoolType: z
      .enum(['Government', 'Private', 'Semi-Private'])
      .optional(),

  board: z
    .string()
    .min(2, 'Board is required'),

  city: z
    .string()
    .min(2, 'City is required'),

  district: z
    .string()
    .min(2, 'District is required'),

  state: z
    .string()
    .min(2, 'State is required'),

  /* ===============================
     PRINCIPAL DETAILS
  =============================== */
  principalName: z
    .string()
    .min(3, 'Principal name must be at least 3 characters'),

  principalEmail: z
    .string()
    .email('Invalid principal email'),

  principalPhone: z
    .string()
    .regex(/^\d{10}$/, 'Principal phone number must be 10 digits'),

  principalQualification: z
    .string()
    .min(2, 'Qualification must be at least 2 characters')
    .max(100, 'Qualification must be at most 100 characters'),

  principalPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters'),

  principalGender: z
    .enum(['Male', 'Female', 'Other'])
    .optional(),

  principalExperience: z
    .number()
    .min(0, 'Experience cannot be negative')
    .max(42, 'Experience cannot exceed 42 years')
    .optional()
});



/* ======================================================
   UPDATE SCHOOL PROFILE
====================================================== */
export const updateSchoolSchema = z
  .object({
    name: z
      .string()
      .min(3, 'School name must be at least 3 characters')
      .optional(),

    establishedYear: z
      .number()
      .int('Established year must be a valid year')
      .min(1900, 'Established year must be 1900 or later')
      .max(new Date().getFullYear(), 'Established year cannot be in the future')
      .optional(),

    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be at most 15 digits')
      .optional(),

    address: z
      .string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address too long')
      .optional(),

    pincode: z
      .string()
      .regex(/^\d{6}$/, 'Pincode must be 6 digits')
      .optional(),

    /* ===== NEW SCHOOL FIELDS ===== */

    schoolType: z
      .enum(['Government', 'Private', 'Semi-Private'])
      .optional(),

    board: z
      .string()
      .min(2, 'Board is required')
      .optional(),

    city: z
      .string()
      .min(2, 'City is required')
      .optional(),

    district: z
      .string()
      .min(2, 'District is required')
      .optional(),

    state: z
      .string()
      .min(2, 'State is required')
      .optional()
  })
  .strict();

/* ======================================================
   UPDATE PRINCIPAL PROFILE
====================================================== */
export const updatePrincipalSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .optional(),

    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional(),

    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be at most 15 digits')
      .optional(),

    qualification: z
      .string()
      .min(2, 'Qualification must be at least 2 characters')
      .max(100, 'Qualification must be at most 100 characters')
      .optional(),

    /* ===== NEW PRINCIPAL FIELDS ===== */

    gender: z
      .enum(['Male', 'Female', 'Other'])
      .optional(),

    yearsOfExperience: z
      .number()
      .min(0, 'Experience cannot be negative')
      .max(60, 'Experience cannot exceed 60 years')
      .optional()
  })


/* 
   SESSION (Academic Year)
*/


export const createSessionSchema = z.object({
  name: z.string().min(3),              // "2024-25"
  startDate: z.coerce.date(),
  endDate: z.coerce.date()
}).refine(
  (data) => data.endDate.getTime() >= data.startDate.getTime(),
  {
    message: 'End date cannot be smaller than start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    const diffInDays = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 730;
  },
  {
    message: 'Session duration cannot be more than 730 days',
    path: ['endDate']
  }
);

export const updateSessionSchema = z.object({
  name: z.string().min(3).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional()
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return data.endDate.getTime() >= data.startDate.getTime();
  },
  {
    message: 'End date cannot be smaller than start date',
    path: ['endDate']
  }
).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    const diffInDays = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 730;
  },
  {
    message: 'Session duration cannot be more than 730 days',
    path: ['endDate']
  }
);


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
export const createTeacherSchema = z
  .object({
  name: z
    .string()
    .min(1, 'Name is required')
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 3,
      { message: 'Name must contain at least 3 letters' }
    ),
  email: z.email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits (numbers only)'),
  dob: z
    .coerce
    .date()
    .refine(
      (d) => {
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
          age -= 1;
        }
        return age >= 18;
      },
      { message: 'DOB must be at least 18 years ago' }
    ),
  gender: z.enum(['male', 'female', 'other'], { message: 'Gender is required' }),
  highestQualification: z
    .string()
    .min(1)
    .max(100)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 2,
      { message: 'Highest qualification must contain at least 2 letters' }
    )
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(0, 'Experience cannot be negative')
    .max(42, 'Experience cannot be greater than 42 years')
    .optional(),
  address: z
    .string()
    .min(1)
    .max(250)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 5,
      { message: 'Address must contain at least 5 letters' }
    )
    .optional(),
  roles: z.array(z.enum(['teacher', 'coordinator'])).min(1).optional(),
  sessionId: z.string().optional()
})
  .superRefine((data, ctx) => {
    if (typeof data.experienceYears === 'number') {
      const age = calcAgeYears(data.dob);
      if (data.experienceYears > age) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['experienceYears'],
          message: 'Experience years cannot be greater than age'
        });
      } else if (age - data.experienceYears < 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['experienceYears'],
          message: 'DOB and experience years difference must be at least 14 years'
        });
      }
    }
  });

//  Update Teacher by Principal
export const updateTeacherSchema = z
  .object({
  name: z
    .string()
    .min(1)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 3,
      { message: 'Name must contain at least 3 letters' }
    )
    .optional(),
  email: z.email().optional(),
  password: z.string().min(6).optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits (numbers only)')
    .optional(),
  dob: z
    .coerce
    .date()
    .refine(
      (d) => {
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
          age -= 1;
        }
        return age >= 18;
      },
      { message: 'DOB must be at least 18 years ago' }
    )
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  highestQualification: z
    .string()
    .min(1)
    .max(100)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 2,
      { message: 'Highest qualification must contain at least 2 letters' }
    )
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(0, 'Experience cannot be negative')
    .max(42, 'Experience cannot be greater than 42 years')
    .optional(),
  address: z
    .string()
    .min(1)
    .max(250)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 5,
      { message: 'Address must contain at least 5 letters' }
    )
    .optional(),
  roles: z.array(z.enum(['teacher', 'coordinator'])).min(1).optional()
})
  .superRefine((data, ctx) => {
    if (data.dob instanceof Date && typeof data.experienceYears === 'number') {
      const age = calcAgeYears(data.dob);
      if (data.experienceYears > age) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['experienceYears'],
          message: 'Experience years cannot be greater than age'
        });
      } else if (age - data.experienceYears < 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['experienceYears'],
          message: 'DOB and experience years difference must be at least 14 years'
        });
      }
    }
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
  name: z
    .string()
    .min(1)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 3,
      { message: 'Name must contain at least 3 letters' }
    )
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits (numbers only)')
    .optional(),
  dob: z
    .coerce
    .date()
    .refine(
      (d) => {
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
          age -= 1;
        }
        return age >= 18;
      },
      { message: 'DOB must be at least 18 years ago' }
    )
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  highestQualification: z
    .string()
    .min(1)
    .max(100)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 2,
      { message: 'Highest qualification must contain at least 2 letters' }
    )
    .optional(),
  experienceYears: z
    .number()
    .int()
    .min(0, 'Experience cannot be negative')
    .max(42, 'Experience cannot be greater than 42 years')
    .optional(),
  address: z
    .string()
    .min(1)
    .max(250)
    .refine(
      (v) => ((v ?? '').trim().match(/[A-Za-z]/g) || []).length >= 5,
      { message: 'Address must contain at least 5 letters' }
    )
    .optional(),
  password: z.string().min(6).optional()
});


///student 

export const createStudentSchema = z.object({
  name: z.string().min(3),
  email: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === 'string' && val.trim() === '') return undefined;
      return val;
    },
    z.string().email().optional()
  ),
  password: z.string().min(6),

  admissionNo: z.string().min(1),
  fatherName: z.string().min(3),
  motherName: z.string().min(3),
  parentsPhone: z.string().min(10).max(13),

  rollNo: z.number().int().positive()
  ,
  classId: z.string().min(1).optional(),
  className: z.string().min(1).optional(),
  section: z.string().min(1).optional()
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

export const planEnum = z.enum(['6M', '1Y', '2Y', '3Y']);

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
  email: z.string().email({ message: 'Invalid email address' }),

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

/* ======================================================
  CONTACT (PUBLIC)
====================================================== */

export const contactMessageSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  phone: z.string().min(10).max(20).optional(),
  subject: z.string().min(2).max(120).optional(),
  message: z.string().min(10).max(2000)
});


