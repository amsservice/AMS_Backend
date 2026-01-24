import { Request, Response } from 'express';
import { TeacherService } from '../services/teacher.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';
import fs from 'fs';
import csv from 'csv-parser';


/* 
   PRINCIPAL (MANAGE TEACHERS) pricipal will create teacher,sea list of teacher update teacher
 */
export const createTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teacher = await TeacherService.createTeacher(schoolId, req.body);
  res.status(201).json(teacher);
};

export const bulkUploadTeachers = async (req: AuthRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    return res.status(400).json({ message: 'CSV file required' });
  }

  const role = req.user!.role;
  if (role !== 'principal') {
    fs.unlink(file.path, () => {});
    return res
      .status(403)
      .json({ message: 'Only principal can upload teachers' });
  }

  const teachers: any[] = [];
  let rowIndex = 1;

  const parseDobToDate = (raw: any) => {
    const v = String(raw ?? '').trim();
    if (!v) return new Date('');

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return new Date(v);
    }

    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yyyy = Number(m[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return d;
    }

    return new Date(v);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', (row) => {
          rowIndex++;

          const name = String(row.name ?? '').trim();
          const email = String(row.email ?? '').trim();
          const password = String(row.password ?? '');
          const phone = String(row.phone ?? '').trim();
          const dobRaw = String(row.dob ?? '').trim();
          const genderRaw = String(row.gender ?? '').trim();
          const gender = genderRaw.toLowerCase();

          const highestQualification = String(row.highestQualification ?? '').trim();
          const experienceRaw = row.experienceYears ?? row.experienceYear;
          const address = String(row.address ?? '').trim();

          const dob = parseDobToDate(dobRaw);

          let experienceYears: number | undefined;
          if (experienceRaw !== undefined && String(experienceRaw).trim() !== '') {
            const n = Number(String(experienceRaw).trim());
            experienceYears = n;
          }

          teachers.push({
            name,
            email,
            password,
            phone,
            dob,
            gender: gender || undefined,
            highestQualification: highestQualification || undefined,
            experienceYears,
            address: address || undefined
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!teachers.length) {
      return res.status(400).json({
        message: 'No teachers found in CSV'
      });
    }

    const result = await TeacherService.bulkCreateTeachers(
      {
        schoolId: new Types.ObjectId(req.user!.schoolId)
      },
      teachers
    );

    if (!result?.success) {
      return res.status(400).json({
        message: 'CSV validation failed',
        ...(result as any),
        invalidRowsCount: 0,
        invalidRows: []
      });
    }

    return res.status(201).json({
      ...result,
      invalidRowsCount: 0,
      invalidRows: []
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    return res.status(400).json({ message: err.message });
  } finally {
    fs.unlink(file.path, () => {});
  }
};

export const listTeachers = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teachers = await TeacherService.listTeachers(schoolId);
  res.status(200).json(teachers);
};

export const updateTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teacher = await TeacherService.updateTeacher(
    schoolId,
    req.params.id,
    req.body
  );

  res.status(200).json(teacher);
};

export const deleteTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.deleteTeacher(
    schoolId,
    req.params.id
  );

  res.status(200).json(result);
};

export const activateTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.activateTeacher(
    schoolId,
    req.params.teacherId
  );

  res.status(200).json(result);
};



//this will use to assign class or change class by only principal
export const assignClassToTeacher = async (
  req: AuthRequest,
  res: Response
) => {
  const { sessionId, classId, className, section } = req.body;
  const { id: teacherId } = req.params;

  // ✅ VALIDATION
  if (
    !Types.ObjectId.isValid(teacherId) ||
    !Types.ObjectId.isValid(sessionId) ||
    !Types.ObjectId.isValid(classId)
  ) {
    return res.status(400).json({
      message: "Invalid teacherId / sessionId / classId"
    });
  }

  const result = await TeacherService.assignClass(
    new Types.ObjectId(req.user!.schoolId),
    {
      teacherId,
      sessionId: new Types.ObjectId(sessionId),
      classId: new Types.ObjectId(classId),
      className,
      section
    }
  );

  res.status(200).json(result);
};

/* ======================================================
   PRINCIPAL: DEACTIVATE TEACHER (SOFT DELETE)
====================================================== */
export const deactivateTeacher = async (
  req: AuthRequest,
  res: Response
) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.deactivateTeacher(
    schoolId,
    req.params.teacherId
  );

  res.status(200).json(result);
};








/* 
   TEACHER (SELF) teacher can see their profile and update 
 */
// export const getMyProfile = async (req: AuthRequest, res: Response) => {
//   const teacher = await TeacherService.getMyProfile(req.user!.userId);
//   res.status(200).json(teacher);
  
  
  
// };


export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const teacher = await TeacherService.getMyProfile(req.user!.userId);

  if (!teacher) {
    return res.status(404).json({
      message: "Teacher not found"
    });
  }

  res.status(200).json({
    user: {
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      role: "teacher"
    }
  });
};


export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const teacher = await TeacherService.updateMyProfile(
    req.user!.userId,
    req.body
  );
  res.status(200).json(teacher);
};


/* ======================================================
   TEACHER: CHANGE OWN PASSWORD
====================================================== */
export const changeMyPassword = async (
  req: AuthRequest,
  res: Response
) => {
  const teacherId = req.user!.userId;
  const { oldPassword, newPassword } = req.body;

  const result = await TeacherService.changeMyPassword(
    teacherId,
    oldPassword,
    newPassword
  );

  res.status(200).json(result);
};




/* ======================================================
   PRINCIPAL DASHBOARD
   TOTAL ACTIVE TEACHERS
====================================================== */
export const getActiveTeacherCount = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const schoolId = new Types.ObjectId(req.user!.schoolId);

    const totalActiveTeachers =
      await TeacherService.countActiveTeachers(schoolId);

    res.status(200).json({ totalActiveTeachers });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to fetch active teacher count',
      error: error.message
    });
  }
};


//swape teachers
export const swapTeacherClasses = async (
  req: AuthRequest,
  res: Response
) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const result = await TeacherService.swapTeacherClasses(schoolId, {
    sessionId: new Types.ObjectId(req.body.sessionId),

    teacherAId: req.body.teacherAId,
    classAId: new Types.ObjectId(req.body.classAId),
    classAName: req.body.classAName,
    sectionA: req.body.sectionA,

    teacherBId: req.body.teacherBId,
    classBId: new Types.ObjectId(req.body.classBId),
    classBName: req.body.classBName,
    sectionB: req.body.sectionB
  });

  res.status(200).json(result);
};

/* ======================================================
   TEACHER (SELF)
   GET FULL TEACHER PROFILE (ALL DETAILS)
====================================================== */
/* ======================================================
   TEACHER / PRINCIPAL
   GET FULL TEACHER DETAILS
====================================================== */
export const getTeacherFullProfileByRole = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const role = req.user!.role;
    let teacherId: string;

    if (role === 'teacher') {
      // Teacher can see ONLY own profile
      teacherId = req.user!.userId;
    } else if (role === 'principal') {
      // Principal can see ANY teacher
      teacherId = req.params.id;
      if (!teacherId) {
        return res.status(400).json({
          message: 'Teacher ID is required'
        });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const teacher =
      await TeacherService.getTeacherFullProfile(teacherId);

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};


/* ======================================================
   TEACHER / PRINCIPAL
   UPDATE TEACHER PROFILE
====================================================== */
export const updateTeacherProfileByRole = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const role = req.user!.role;

    const teacher = await TeacherService.updateTeacherProfile(
      {
        schoolId: new Types.ObjectId(req.user!.schoolId),
        requesterRole: role,
        requesterId: req.user!.userId,
        teacherId: role === 'principal' ? req.params.id : undefined
      },
      req.body
    );

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


