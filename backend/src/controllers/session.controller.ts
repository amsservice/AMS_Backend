
import { Response } from 'express';
import { Types } from 'mongoose';
import { SessionService } from '../services/session.service';
import { AuthRequest } from '../middleware/auth.middleware';

/* =====================================================
   CREATE SESSION (Principal only)
   - New session is created as INACTIVE (safe default)
===================================================== */
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = new Types.ObjectId(req.user!.schoolId);

    const session = await SessionService.createSession(
      schoolId,
      req.body
    );

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   GET SESSIONS (Role-based)
   - Principal → all school sessions
   - Teacher   → assigned sessions only
   - Student   → enrolled sessions only
===================================================== */
export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { roles, schoolId, userId } = req.user!;

    let sessions;

    if (roles.includes('principal') || roles.includes('coordinator')) {
      sessions = await SessionService.getSessions(
        new Types.ObjectId(schoolId)
      );
    } else if (roles.includes('teacher')) {
      sessions = await SessionService.getSessionsForTeacher(userId);
    } else {
      sessions = await SessionService.getSessionsForStudent(userId);
    }

    return res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   UPDATE SESSION (Principal only)
   - Edit name / dates
   - Activate or deactivate session
   - Ensures only ONE active session per school
===================================================== */
export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id'
      });
    }

    const schoolId = new Types.ObjectId(req.user!.schoolId);
    const sessionId = new Types.ObjectId(req.params.id);

    const session = await SessionService.updateSession(
      schoolId,
      sessionId,
      req.body
    );

    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   GET SESSION DELETE STATUS (Principal only)
   - Returns canDelete and hasAssociatedData status
===================================================== */
export const getSessionDeleteStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id'
      });
    }

    const schoolId = new Types.ObjectId(req.user!.schoolId);
    const sessionId = new Types.ObjectId(req.params.id);

    const status = await SessionService.getSessionDeleteStatus(
      schoolId,
      sessionId
    );

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   DELETE SESSION (Principal only)
   - ONLY inactive sessions can be deleted
   - No related data is touched
===================================================== */
export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id'
      });
    }

    const schoolId = new Types.ObjectId(req.user!.schoolId);
    const sessionId = new Types.ObjectId(req.params.id);

    await SessionService.deleteSession(
      schoolId,
      sessionId
    );

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};