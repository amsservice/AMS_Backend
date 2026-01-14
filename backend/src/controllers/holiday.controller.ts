import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { HolidayService } from '../services/holiday.service';
import { Session } from '../models/Session';

/* ======================================================
   CREATE HOLIDAY
====================================================== */
export const createHoliday = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name,startDate, endDate, description, category } = req.body;

    // ✅ Validate required fields
    if (!name || !startDate || !category) {
      res.status(400).json({
        message: 'Name, date and category are required'
      });
      return;
    }

    // ✅ Get active session
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      res.status(400).json({
        message: 'No active academic session found'
      });
      return;
    }

    // ✅ Create holiday
    const holiday = await HolidayService.createHoliday({
      name,
     startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      description,
      category,
      schoolId:new Types.ObjectId(req.user!.schoolId),

      sessionId: activeSession._id
    });

    res.status(201).json(holiday);
  } catch (error: any) {
    console.error('CREATE HOLIDAY ERROR:', error);

    // 🔁 Duplicate holiday (same date)
    if (error.code === 11000) {
      res.status(409).json({
        message: 'Holiday already exists for this date'
      });
      return;
    }

    res.status(500).json({
      message: error.message || 'Failed to create holiday'
    });
  }
};

/* ======================================================
   GET HOLIDAYS
====================================================== */
export const getHolidays = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!activeSession) {
      res.json([]);
      return;
    }

    const holidays = await HolidayService.getHolidays(
      new Types.ObjectId(req.user!.schoolId)
,
      activeSession._id
    );

    res.json(holidays);
  } catch (error: any) {
    console.error('GET HOLIDAYS ERROR:', error);
    res.status(500).json({
      message: 'Failed to fetch holidays'
    });
  }
};

/* ======================================================
   UPDATE HOLIDAY
====================================================== */
export const updateHoliday = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const session = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    });

    if (!session) {
      res.status(400).json({ message: 'No active session found' });
      return;
    }

    const updated = await HolidayService.updateHoliday(
      new Types.ObjectId(req.params.id),
      new Types.ObjectId(req.user!.schoolId),
      session._id,
      req.body
    );

    if (!updated) {
      res.status(404).json({ message: 'Holiday not found' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   DELETE HOLIDAY
====================================================== */
export const deleteHoliday = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const deleted = await HolidayService.deleteHoliday(
      req.params.id as unknown as Types.ObjectId,
      new Types.ObjectId(req.user!.schoolId)

    );

    if (!deleted) {
      res.status(404).json({
        message: 'Holiday not found'
      });
      return;
    }

    res.json({
      message: 'Holiday deleted successfully'
    });
  } catch (error: any) {
    console.error('DELETE HOLIDAY ERROR:', error);
    res.status(500).json({
      message: 'Failed to delete holiday'
    });
  }
};
