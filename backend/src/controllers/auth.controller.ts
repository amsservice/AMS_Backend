

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

/* ======================================================
   SCHOOL REGISTER (GMAIL + OTP)
====================================================== */
// export const registerSchool = async (req: Request, res: Response) => {
//   const result = await AuthService.registerSchool(req.body);
//   res.status(201).json(result);
// };

export const registerSchool = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.registerSchool(req.body);
    res.status(201).json(result);

  } catch (error: any) {
    console.error('Registration error:', error);

    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
};


/* ======================================================
   VERIFY SCHOOL EMAIL OTP
====================================================== */
export const verifySchoolOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const result = await AuthService.verifySchoolOtp(email, otp);
  res.status(200).json(result);
};

/* ======================================================
   PRINCIPAL LOGIN (OTP + SUBSCRIPTION REQUIRED)
====================================================== */
export const loginPrincipal = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.loginPrincipal(email, password);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Login failed"
    });
  }
};

/* ======================================================
   LOGOUT
====================================================== */
export const logout = async (_req: Request, res: Response) => {
  const result = await AuthService.logout();
  res.status(200).json(result);
};

/* ======================================================
   UPDATE PRINCIPAL PROFILE
====================================================== */
export const updatePrincipalProfile = async (
  req: AuthRequest,
  res: Response
) => {
  const principalId = req.user!.userId;
  const result = await AuthService.updatePrincipal(principalId, req.body);

  res.status(200).json(result);
};

/* ======================================================
   GET PRINCIPAL PROFILE
====================================================== */
export const getPrincipalProfile = async (
  req: AuthRequest,
  res: Response
) => {
  const principalId = req.user!.userId;
  const principal = await AuthService.getPrincipal(principalId);

  res.status(200).json({
    user: {
      id: principal._id.toString(),
      name: principal.name,
      email: principal.email,
      role: 'principal'
    }
  });
};

/* ======================================================
   TEACHER LOGIN (UNCHANGED)
====================================================== */
export const loginTeacher = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.loginTeacher(email, password);

  res.status(200).json(result);
};

/* ======================================================
   STUDENT LOGIN (UNCHANGED)
====================================================== */
export const loginStudent = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.loginStudent(email, password);

  res.status(200).json(result);
};

/* ======================================================
   RESEND OTP
====================================================== */
export const resendSchoolOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  const result = await AuthService.resendSchoolOtp(email);

  res.status(200).json(result);
};