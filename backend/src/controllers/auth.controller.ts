import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const registerSchool = async (req: Request, res: Response) => {
  const result = await AuthService.registerSchool(req.body);
  res.status(201).json(result);
};


/* ======================================================
   PRINCIPAL LOGIN
====================================================== */
export const loginPrincipal = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await AuthService.loginPrincipal(email, password);

  res.status(200).json(result);
};

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
   TEACHER LOGIN
====================================================== */
export const loginTeacher = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await AuthService.loginTeacher(email, password);

  res.status(200).json(result);
};

// export const loginTeacher = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     const result = await AuthService.loginTeacher(email, password);

//     res.status(200).json(result);
//   } catch (error: any) {
//     res.status(401).json({
//       message: error.message || 'Teacher login failed'
//     });
//   }
// };


/* ======================================================
   STUDENT LOGIN
====================================================== */
export const loginStudent = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await AuthService.loginStudent(email, password);

  res.status(200).json(result);
};
