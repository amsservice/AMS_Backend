import { Response } from 'express';
import { Types } from 'mongoose';
import { SessionService } from '../services/session.service';
import { AuthRequest } from '../middleware/auth.middleware';

/* ======================================================
   CREATE SESSION (Principal only)
====================================================== */
export const createSession = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const session = await SessionService.createSession(schoolId, req.body);

  res.status(201).json(session);
};

/* ======================================================
   GET SESSIONS (ROLE AWARE)
   - Principal → all school sessions
   - Teacher   → assigned sessions only
   - Student   → enrolled sessions only
====================================================== */
export const getSessions = async (req: AuthRequest, res: Response) => {
  const { role, schoolId, userId } = req.user!;

  let sessions;

  if (role === 'principal') {
    sessions = await SessionService.getSessions(
      new Types.ObjectId(schoolId)
    );
  } else if (role === 'teacher') {
    sessions = await SessionService.getSessionsForTeacher(userId);
  } else {
    sessions = await SessionService.getSessionsForStudent(userId);
  }

  res.status(200).json(sessions);
};

/* ======================================================
   UPDATE SESSION (Principal only)
====================================================== */
export const updateSession = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);
  const sessionId = new Types.ObjectId(req.params.id);

  const session = await SessionService.updateSession(
    schoolId,
    sessionId,
    req.body
  );

  res.status(200).json(session);
};
