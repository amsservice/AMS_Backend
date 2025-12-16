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
  principalPassword: z.string().min(6)
});
