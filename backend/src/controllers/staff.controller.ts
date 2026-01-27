import { Response } from "express";
import { Types } from "mongoose";
import { StaffService } from "../services/staff.service";
import { AuthRequest } from "../middleware/auth.middleware";
import fs from 'fs';
import csv from 'csv-parser';
import { Session } from "../models/Session";

/* ================= CREATE ================= */

export const createStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);
  const sessionId = new Types.ObjectId(req.body.sessionId);

  try {
    const staff = await StaffService.createStaff(schoolId, sessionId, req.body);
    return res.status(201).json(staff);
  } catch (err: any) {
    if (err?.code === 'TEACHER_INACTIVE_EMAIL_EXISTS') {
      return res.status(409).json({
        code: 'TEACHER_INACTIVE_EMAIL_EXISTS',
        message: 'This email already exists with inactive status',
        teacherId: err?.teacherId,
        email: err?.email
      });
    }

    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(400).json({ message: err?.message || 'Failed to create staff' });
  }
};

export const bulkDeactivateStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const ids = Array.isArray((req.body as any)?.ids) ? (req.body as any).ids : [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids is required' });
  }

  const results = await Promise.all(
    ids.map(async (idRaw: any) => {
      const id = String(idRaw || '').trim();
      if (!id || !Types.ObjectId.isValid(id)) {
        return { id, ok: false, message: 'Invalid id' };
      }

      try {
        await StaffService.deactivateStaff(schoolId, id);
        return { id, ok: true };
      } catch (err: any) {
        return { id, ok: false, message: err?.message || 'Failed', code: err?.code };
      }
    })
  );

  const successCount = results.filter((r) => r.ok).length;
  return res.json({ success: true, successCount, results });
};

export const bulkUploadStaff = async (req: AuthRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ message: "CSV file required" });
  }

  const roles = req.user!.roles;
  const isAllowed = roles.includes("principal") || roles.includes("coordinator");
  if (!isAllowed) {
    fs.unlink(file.path, () => {});
    return res.status(403).json({ message: "Only principal/coordinator can upload staff" });
  }

  let sessionId: Types.ObjectId | null = null;
  const sessionIdRaw = String((req.body as any)?.sessionId || "").trim();
  if (sessionIdRaw) {
    if (!Types.ObjectId.isValid(sessionIdRaw)) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ message: "Invalid sessionId" });
    }

    const sessionDoc = await Session.findOne({
      _id: new Types.ObjectId(sessionIdRaw),
      schoolId: req.user!.schoolId
    })
      .select("_id")
      .lean();

    if (!sessionDoc?._id) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ message: "Invalid sessionId" });
    }

    sessionId = new Types.ObjectId(sessionDoc._id);
  } else {
    const activeSession = await Session.findOne({
      schoolId: req.user!.schoolId,
      isActive: true
    })
      .select("_id")
      .lean();

    if (activeSession?._id) {
      sessionId = new Types.ObjectId(activeSession._id);
    } else {
      const latestSession = await Session.findOne({
        schoolId: req.user!.schoolId
      })
        .sort({ startDate: -1 })
        .select("_id")
        .lean();

      if (!latestSession?._id) {
        fs.unlink(file.path, () => {});
        return res.status(400).json({
          message: "No active academic session found. Please create or activate a session first."
        });
      }

      sessionId = new Types.ObjectId(latestSession._id);
    }
  }

  const staffRoleRaw = String((req.body as any)?.role || "teacher").trim();
  const staffRole = staffRoleRaw === "coordinator" ? "coordinator" : "teacher";

  const staffRows: any[] = [];

  const parseDobToDate = (raw: any) => {
    const v = String(raw ?? "").trim();
    if (!v) return new Date("");

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return new Date(v);
    }

    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      return new Date(yyyy, mm - 1, dd);
    }

    return new Date(v);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (row) => {
          const name = String(row.name ?? "").trim();
          const email = String(row.email ?? "").trim();
          const password = String(row.password ?? "");
          const phone = String(row.phone ?? "").trim();
          const dobRaw = String(row.dob ?? "").trim();
          const genderRaw = String(row.gender ?? "").trim();
          const gender = genderRaw.toLowerCase();

          const highestQualification = String(row.highestQualification ?? "").trim();
          const experienceRaw = row.experienceYears ?? row.experienceYear;
          const address = String(row.address ?? "").trim();

          const dob = parseDobToDate(dobRaw);

          let experienceYears: number | undefined;
          if (experienceRaw !== undefined && String(experienceRaw).trim() !== "") {
            experienceYears = Number(String(experienceRaw).trim());
          }

          staffRows.push({
            name,
            email,
            password,
            phone,
            dob,
            gender: gender || undefined,
            highestQualification: highestQualification || undefined,
            experienceYears,
            address: address || undefined,
            roles: [staffRole]
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!staffRows.length) {
      return res.status(400).json({ message: "No staff found in CSV" });
    }

    const result = await StaffService.bulkCreateStaff(
      {
        schoolId: new Types.ObjectId(req.user!.schoolId),
        sessionId: sessionId as Types.ObjectId
      },
      staffRows
    );

    if (!result?.success) {
      return res.status(400).json({ message: "CSV validation failed", ...(result as any) });
    }

    return res.status(201).json(result);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    return res.status(400).json({ message: err?.message || "Bulk upload failed" });
  } finally {
    fs.unlink(file.path, () => {});
  }
};

/* ================= LIST ================= */

export const listStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  try {
    const pageRaw = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    let isActive: boolean | undefined;
    if (typeof req.query.isActive === 'string') {
      const v = req.query.isActive.trim().toLowerCase();
      if (v === 'true') isActive = true;
      else if (v === 'false') isActive = false;
    }

    const staff = await StaffService.listStaff(schoolId, {
      page: Number.isFinite(pageRaw as any) ? (pageRaw as number) : undefined,
      limit: Number.isFinite(limitRaw as any) ? (limitRaw as number) : undefined,
      q,
      isActive
    });

    res.json(staff);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to list staff' });
  }
};

// export const bulkUploadStaff = async (req: AuthRequest, res: Response) => {
//   const file = (req as any).file;
//   if (!file) {
//     return res.status(400).json({ message: 'CSV file required' });
//   }

//   const sessionIdRaw = String(req.body?.sessionId ?? '').trim();
//   if (!Types.ObjectId.isValid(sessionIdRaw)) {
//     fs.unlink(file.path, () => {});
//     return res.status(400).json({ message: 'Valid sessionId is required' });
//   }

//   const sessionId = new Types.ObjectId(sessionIdRaw);
//   const staffRows: any[] = [];

//   const parseDobToDate = (raw: any) => {
//     const v = String(raw ?? '').trim();
//     if (!v) return new Date('');

//     if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
//       return new Date(v);
//     }

//     const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
//     if (m) {
//       const dd = Number(m[1]);
//       const mm = Number(m[2]);
//       const yyyy = Number(m[3]);
//       return new Date(yyyy, mm - 1, dd);
//     }

//     return new Date(v);
//   };

//   try {
//     await new Promise<void>((resolve, reject) => {
//       fs.createReadStream(file.path)
//         .pipe(csv())
//         .on('data', (row) => {
//           const name = String(row.name ?? '').trim();
//           const email = String(row.email ?? '').trim();
//           const password = String(row.password ?? '');
//           const phone = String(row.phone ?? '').trim();
//           const dobRaw = String(row.dob ?? '').trim();
//           const genderRaw = String(row.gender ?? '').trim();
//           const gender = genderRaw.toLowerCase();

//           const highestQualification = String(row.highestQualification ?? '').trim();
//           const experienceRaw = row.experienceYears ?? row.experienceYear;
//           const address = String(row.address ?? '').trim();

//           const roleRaw = String(row.role ?? '').trim().toLowerCase();
//           const role =
//             !roleRaw
//               ? undefined
//               : roleRaw === 'coordinator'
//                 ? 'coordinator'
//                 : roleRaw === 'teacher'
//                   ? 'teacher'
//                   : roleRaw;

//           const dob = parseDobToDate(dobRaw);

//           let experienceYears: number | undefined;
//           if (experienceRaw !== undefined && String(experienceRaw).trim() !== '') {
//             const n = Number(String(experienceRaw).trim());
//             experienceYears = n;
//           }

//           staffRows.push({
//             name,
//             email,
//             password,
//             phone,
//             dob,
//             gender: gender || undefined,
//             highestQualification: highestQualification || undefined,
//             experienceYears,
//             address: address || undefined,
//             role
//           });
//         })
//         .on('end', resolve)
//         .on('error', reject);
//     });

//     if (!staffRows.length) {
//       return res.status(400).json({ message: 'No staff found in CSV' });
//     }

//     const result = await StaffService.bulkCreateStaff(
//       {
//         schoolId: new Types.ObjectId(req.user!.schoolId),
//         sessionId
//       },
//       staffRows
//     );

//     if (!result?.success) {
//       return res.status(400).json({
//         message: 'CSV validation failed',
//         ...(result as any),
//         invalidRowsCount: 0,
//         invalidRows: []
//       });
//     }

//     return res.status(201).json({
//       ...result,
//       invalidRowsCount: 0,
//       invalidRows: []
//     });
//   } catch (err: any) {
//     if (err?.code === 11000) {
//       return res.status(400).json({ message: 'Email already exists' });
//     }
//     return res.status(400).json({ message: err.message });
//   } finally {
//     fs.unlink(file.path, () => {});
//   }
// };

/* ================= UPDATE ================= */

export const updateStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  try {
    const staff = await StaffService.updateStaff(
      schoolId,
      req.params.id,
      req.body,
    );

    res.json(staff);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to update staff', code: err?.code });
  }
};

/* ================= DELETE ================= */

export const deleteStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  try {
    const result = await StaffService.deleteStaff(schoolId, req.params.id);
    res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to delete staff', code: err?.code });
  }
};

/* ================= ACTIVATE / DEACTIVATE ================= */

export const deactivateStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  try {
    const result = await StaffService.deactivateStaff(schoolId, req.params.id);
    res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to deactivate staff', code: err?.code });
  }
};

export const activateStaff = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  try {
    const result = await StaffService.activateStaff(schoolId, req.params.id);
    res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to activate staff', code: err?.code });
  }
};

/* ================= ASSIGN CLASS ================= */

export const assignClassToStaff = async (req: AuthRequest, res: Response) => {
  const { sessionId, classId, className, section } = req.body;
  const staffId = req.params.id;

  try {
    const result = await StaffService.assignClass(
      new Types.ObjectId(req.user!.schoolId),
      {
        staffId,
        sessionId: new Types.ObjectId(sessionId),
        classId: new Types.ObjectId(classId),
        className,
        section,
      },
    );

    res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err?.message || 'Failed to assign class', code: err?.code });
  }
};

/* ================= SELF ================= */

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const staff = await StaffService.getMyProfile(req.user!.userId);
  if (!staff) return res.status(404).json({ message: "Not found" });

  res.json(staff);
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const staff = await StaffService.updateMyProfile(req.user!.userId, req.body);
  res.json(staff);
};

export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const result = await StaffService.changeMyPassword(
    req.user!.userId,
    oldPassword,
    newPassword,
  );

  res.json(result);
};

/* ================= DASHBOARD ================= */

export const getActiveTeacherCount = async (
  req: AuthRequest,
  res: Response,
) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);
  const count = await StaffService.countActiveTeachers(schoolId);

  res.json({ totalActiveTeachers: count });
};

/* ================= FULL PROFILE ================= */

export const getStaffFullProfileByRole = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  let staffId: string;

  if (roles.includes('teacher') || roles.includes('coordinator')) {
    staffId = req.user!.userId;
  } else if (roles.includes('principal')) {
    staffId = req.params.id;
  } else {
    return res.status(403).json({ message: 'Access denied' });
  }

  const staff = await StaffService.getStaffFullProfile(staffId);
  res.json({ success: true, data: staff });
};


/* ================= UPDATE PROFILE BY ROLE ================= */

export const updateStaffProfileByRole = async (req: AuthRequest, res: Response) => {
  const staff = await StaffService.updateStaffProfile(
    {
      schoolId: new Types.ObjectId(req.user!.schoolId),
      requesterRole: req.user!.roles,   // ✅ changed
      requesterId: req.user!.userId,
      staffId: req.params.id
    },
    req.body
  );

  res.json({ success: true, data: staff });
};


export const swapStaffClasses = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await StaffService.swapStaffClasses(schoolId, {
    sessionId: new Types.ObjectId(req.body.sessionId),

    staffAId: req.body.staffAId,
    classAId: new Types.ObjectId(req.body.classAId),
    classAName: req.body.classAName,
    sectionA: req.body.sectionA,

    staffBId: req.body.staffBId,
    classBId: new Types.ObjectId(req.body.classBId),
    classBName: req.body.classBName,
    sectionB: req.body.sectionB,
  });

  res.status(200).json(result);
};
