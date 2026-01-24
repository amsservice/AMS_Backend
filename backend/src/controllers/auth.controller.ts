import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { setAuthCookies } from "../utils/jwt";

/* ======================================================
   REFRESH TOKEN
====================================================== */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    // This returns the new accessToken (7-day lifespan)
    res.status(200).json({
      success: true,
      // ...result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || "Session expired. Please login again.",
    });
  }
};

export const registerSchool = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.registerSchool(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error?.statusCode === 409) {
      return res.status(200).json({
        success: false,
        statusCode: 409,
        message: error.message || "School email already registered",
        data: error.data,
      });
    }

    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Registration failed",
      data: error.data,
    });
  }
};

export const updatePendingSchoolRegistration = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await AuthService.updatePendingSchoolRegistration(req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Update pending registration error:", error);

    if (error?.statusCode === 409) {
      return res.status(200).json({
        success: false,
        statusCode: 409,
        message: error.message || "School email already registered",
        data: error.data,
      });
    }

    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Update failed",
      data: error.data,
    });
  }
};

/* ======================================================
   VERIFY SCHOOL EMAIL OTP
====================================================== */
export const verifySchoolOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.verifySchoolOtp(email, otp);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const { accessToken, refreshToken, ...safeResult } = result;
    res.status(200).json(safeResult);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

/* ======================================================
   PRINCIPAL LOGIN (SCHOOL CODE + EMAIL + PASSWORD)
====================================================== */
export const loginPrincipal = async (req: Request, res: Response) => {
  try {
    const { email, password, schoolCode } = req.body;

    if (!schoolCode) {
      return res.status(400).json({
        message: "School code is required",
      });
    }

    const result = await AuthService.loginPrincipal(
      email,
      password,
      Number(schoolCode),
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    const { accessToken, refreshToken, ...safeResult } = result;    
    res.status(200).json(safeResult);
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Login failed",
    });
  }
};

/* ======================================================
   LOGOUT
====================================================== */
export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

/* ======================================================
   UPDATE PRINCIPAL PROFILE
====================================================== */
export const updatePrincipalProfile = async (
  req: AuthRequest,
  res: Response,
) => {
  const principalId = req.user!.userId;
  const result = await AuthService.updatePrincipal(principalId, req.body);

  res.status(200).json(result);
};

/* ======================================================
   GET PRINCIPAL PROFILE
====================================================== */
export const getPrincipalProfile = async (req: AuthRequest, res: Response) => {
  const principalId = req.user!.userId;
  const principal = await AuthService.getPrincipal(principalId);

  res.status(200).json({
    user: {
      id: principal._id.toString(),
      name: principal.name,
      email: principal.email,
      role: "principal",
    },
  });
};

/* ======================================================
   TEACHER LOGIN (UNCHANGED)
====================================================== */
export const loginTeacher = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.loginTeacher(email, password);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  const { accessToken, refreshToken, ...safeResult } = result; 
  res.status(200).json(safeResult);
};

/* ======================================================
   STUDENT LOGIN (UNCHANGED)
====================================================== */
export const loginStudent = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.loginStudent(email, password);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  const { accessToken, refreshToken, ...safeResult } = result; 
  res.status(200).json(safeResult);
};

/* ======================================================
   RESEND OTP
====================================================== */
export const resendSchoolOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  const result = await AuthService.resendSchoolOtp(email);

  res.status(200).json(result);
};

export const getSchoolPaymentStatus = async (req: Request, res: Response) => {
  try {
    const email = String(req.query.email || "")
      .toLowerCase()
      .trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const status = await AuthService.getSchoolPaymentStatus(email);

    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Failed to fetch payment status",
    });
  }
};
