import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const registerSchool = async (req: Request, res: Response) => {
  const result = await AuthService.registerSchool(req.body);
  res.status(201).json(result);
};
