// import { Response } from 'express';
// import { Types } from 'mongoose';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { ClassService } from '../services/class.service';

// export const createClass = async (req: AuthRequest, res: Response) => {
//   const cls = await ClassService.createClass({
//     ...req.body,
//     schoolId: req.user!.schoolId as any
//   });

//   res.status(201).json(cls);
// };

// export const getClasses = async (req: AuthRequest, res: Response) => {
//   const classes = await ClassService.getClasses(
//     req.user!.schoolId as any,
//     req.query.sessionId as any
//   );

//   res.json(classes);
// };


///new code

// // controllers/class.controller.ts
// import { Response } from 'express';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { ClassService } from '../services/class.service';
// import { Session } from '../models/Session';

// /**
//  * Create Class
//  * Principal only
//  * sessionId is automatically injected
//  */
// export const createClass = async (req: AuthRequest, res: Response) => {
//   try {
//     const { name, section } = req.body;

//     // 1️⃣ Find active session
//     const activeSession = await Session.findOne({
//       schoolId: req.user!.schoolId,
//       isActive: true
//     });

//     if (!activeSession) {
//       return res.status(400).json({
//         message: 'No active academic session found. Please create or activate a session first.'
//       });
//     }

//     // 2️⃣ Create class
//     const cls = await ClassService.createClass({
//       name,
//       section,
//       schoolId: req.user!.schoolId as any,
//       sessionId: activeSession._id
//     });

//     res.status(201).json(cls);

//   } catch (error: any) {
//     res.status(500).json({
//       message: error.message || 'Failed to create class'
//     });
//   }
// };

// /**
//  * Get Classes
//  * Only classes of active session
//  */
// export const getClasses = async (req: AuthRequest, res: Response) => {
//   try {
//     // 1️⃣ Get active session
//     const activeSession = await Session.findOne({
//       schoolId: req.user!.schoolId,
//       isActive: true
//     });

//     if (!activeSession) {
//       return res.json([]);
//     }

//     // 2️⃣ Fetch classes
//     const classes = await ClassService.getClasses(
//       req.user!.schoolId as any,
//       activeSession._id
//     );

//     res.json(classes);

//   } catch (error: any) {
//     res.status(500).json({
//       message: error.message || 'Failed to fetch classes'
//     });
//   }
// };



// controllers/class.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClassService } from '../services/class.service';
import { Session } from '../models/Session';
import { Class } from '../models/Class'; // ✅ ADD THIS

/**
 * Create Class
 * Principal only
 * Prevents duplicate classes per session
 */
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

    // 2️⃣ Prevent duplicate class in same session ✅
    const exists = await Class.findOne({
      name,
      section,
      schoolId: req.user!.schoolId,
      sessionId: activeSession._id
    });

    if (exists) {
      return res.status(409).json({
        message: 'Class already exists for this session'
      });
    }

    // 3️⃣ Create class
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
