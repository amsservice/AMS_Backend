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

    const trimmedName = String(name).trim();
    if (!/^[A-Za-z0-9\s]+$/.test(trimmedName)) {
      res.status(400).json({
        message: 'Holiday name can contain only letters, numbers, and spaces'
      });
      return;
    }

    const lettersCount = (trimmedName.match(/[A-Za-z]/g) || []).length;
    if (lettersCount < 3) {
      res.status(400).json({ message: 'Holiday name must contain at least 3 letters' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (Number.isNaN(start.getTime())) {
      res.status(400).json({ message: 'Invalid start date' });
      return;
    }

    if (start.getTime() <= today.getTime()) {
      res.status(400).json({ message: 'Holiday can be marked only on future dates' });
      return;
    }

    let end: Date | undefined;
    if (endDate) {
      end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      if (Number.isNaN(end.getTime())) {
        res.status(400).json({ message: 'Invalid end date' });
        return;
      }
      if (end.getTime() <= today.getTime()) {
        res.status(400).json({ message: 'Holiday can be marked only on future dates' });
        return;
      }
      if (end.getTime() < start.getTime()) {
        res.status(400).json({ message: 'End date must be greater than or equal to start date' });
        return;
      }
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
      name: trimmedName,
      startDate: start,
      endDate: end,
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
        message: 'Duplicate holiday key'
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

    const data: any = { ...req.body };

    if (typeof data.name === 'string') {
      const trimmedName = data.name.trim();
      if (!/^[A-Za-z0-9\s]+$/.test(trimmedName)) {
        res.status(400).json({
          message: 'Holiday name can contain only letters, numbers, and spaces'
        });
        return;
      }

      const lettersCount = (trimmedName.match(/[A-Za-z]/g) || []).length;
      if (lettersCount < 3) {
        res.status(400).json({ message: 'Holiday name must contain at least 3 letters' });
        return;
      }
      data.name = trimmedName;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (data.startDate) {
      const start = new Date(data.startDate);
      start.setHours(0, 0, 0, 0);
      if (Number.isNaN(start.getTime())) {
        res.status(400).json({ message: 'Invalid start date' });
        return;
      }
      if (start.getTime() <= today.getTime()) {
        res.status(400).json({ message: 'Holiday can be marked only on future dates' });
        return;
      }
      data.startDate = start;

      if (data.endDate) {
        const end = new Date(data.endDate);
        end.setHours(0, 0, 0, 0);
        if (Number.isNaN(end.getTime())) {
          res.status(400).json({ message: 'Invalid end date' });
          return;
        }
        if (end.getTime() <= today.getTime()) {
          res.status(400).json({ message: 'Holiday can be marked only on future dates' });
          return;
        }
        if (end.getTime() < start.getTime()) {
          res.status(400).json({ message: 'End date must be greater than or equal to start date' });
          return;
        }
        data.endDate = end;
      }
    } else if (data.endDate) {
      const end = new Date(data.endDate);
      end.setHours(0, 0, 0, 0);
      if (Number.isNaN(end.getTime())) {
        res.status(400).json({ message: 'Invalid end date' });
        return;
      }
      if (end.getTime() <= today.getTime()) {
        res.status(400).json({ message: 'Holiday can be marked only on future dates' });
        return;
      }
      data.endDate = end;
    }

    const updated = await HolidayService.updateHoliday(
      new Types.ObjectId(req.params.id),
      new Types.ObjectId(req.user!.schoolId),
      session._id,
      data
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
