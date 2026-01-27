// controllers/class.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';
import { Session } from '../models/Session';
import { Class } from '../models/Class'; // ✅ ADD THIS
import { Types } from 'mongoose';


export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { name, section } = req.body;

    // 1️⃣ Find active session
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      return res.status(400).json({
        message: 'No active academic session found. Please create or activate a session first.'
      });
    }

    // 2 Prevent duplicate class in same session 
    const exists = await Class.findOne({
      name,
      section,
      schoolId: req.user!.schoolId,
      sessionId: activeSession._id,
      isActive: true
    });

    if (exists) {
      return res.status(409).json({
        message: 'Class already exists for this session'
      });
    }

    // 3 Create class
    const cls = await ClassService.createClass({
      name,
      section,
      schoolId: req.user!.schoolId as any,
      sessionId: activeSession._id
    });

    res.status(201).json(cls);

  } catch (error: any) {
    res.status(500).json({
      message: error.message || 'Failed to create class'
    });
  }
};

/**
 * Get Classes
 * Only classes of active session
 */
export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      return res.json([]);
    }

    const classes = await ClassService.getClasses(
      req.user!.schoolId as any,
      activeSession._id
    );

    res.json(classes);

  } catch (error: any) {
    res.status(500).json({
      message: error.message || 'Failed to fetch classes'
    });
  }
};


/* ======================================
   PRINCIPAL / COORDINATOR DASHBOARD STATS
====================================== */
export const getTotalClasses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {

  // Find active session
  const activeSession = await Session.findOne({
    schoolId: req.user!.schoolId,
    isActive: true
  });

  if (!activeSession) {
    res.json({
      totalClasses: 0
    });
    return;
  }

  // Total classes
  const totalClasses = await ClassService.getTotalClasses(
    req.user!.schoolId as any,
    activeSession._id
  );

  res.json({
    totalClasses
  });
};





/* =========================
   UPDATE CLASS
========================= */
export const updateClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const activeSession = await Session.findOne({
    schoolId: req.user!.schoolId,
    isActive: true
  });

  if (!activeSession) {
    res.status(400).json({ message: 'No active session found' });
    return;
  }

  const updatedClass = await ClassService.updateClass(
    new Types.ObjectId(req.params.id),
    new Types.ObjectId(req.user!.schoolId),
    activeSession._id,
    req.body
  );

  if (!updatedClass) {
    res.status(404).json({ message: 'Class not found' });
    return;
  }

  res.json(updatedClass);
};

// export const updateClass = async (req: AuthRequest, res: Response) => {
//   const { id } = req.params;

//   // SAFE ObjectId conversion
//   const classId = new Types.ObjectId(id);
//   const schoolId = new Types.ObjectId(req.user!.schoolId);

//   const updated = await ClassService.updateClass(
//     classId,
//     schoolId,
    
//     req.body
//   );

//   if (!updated) {
//     res.status(404).json({ message: 'Class not found' });
//     return;
//   }

//   res.json(updated);
// };

/* =========================
   BULK DELETE CLASSES
========================= */
export const bulkDeleteClasses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      res.status(400).json({ message: 'No active session found' });
      return;
    }

    const ids = Array.isArray((req.body as any)?.ids) ? (req.body as any).ids : [];
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'ids is required' });
      return;
    }

    const results = await Promise.all(
      ids.map(async (idRaw: any) => {
        const id = String(idRaw || '').trim();
        if (!id || !Types.ObjectId.isValid(id)) {
          return { id, ok: false, message: 'Invalid id' };
        }

        try {
          await ClassService.deleteClass(
            new Types.ObjectId(id),
            new Types.ObjectId(req.user!.schoolId),
            activeSession._id
          );
          return { id, ok: true };
        } catch (err: any) {
          return { id, ok: false, message: err?.message || 'Failed' };
        }
      })
    );

    const successCount = results.filter((r) => r.ok).length;
    res.json({ success: true, successCount, results });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/* =========================
   DELETE CLASS
========================= */
export const deleteClass = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      res.status(400).json({ message: 'No active session found' });
      return;
    }

    const deleted = await ClassService.deleteClass(
      new Types.ObjectId(req.params.id),
      new Types.ObjectId(req.user!.schoolId),
      activeSession._id
    );

    if (!deleted) {
      res.status(404).json({ message: 'Class not found' });
      return;
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};