import { Request, Response } from 'express';
import { TeacherService } from '../services/teacher.service';
import { AuthRequest } from '../middleware/auth.middleware';
import  { Types } from 'mongoose';


/* 
   PRINCIPAL (MANAGE TEACHERS) pricipal will create teacher,sea list of teacher update teacher
 */
export const createTeacher = async (req: AuthRequest, res: Response) => {
  const schoolId = new Types.ObjectId(req.user!.schoolId);

  const teacher = await TeacherService.createTeacher(schoolId, req.body);
  res.status(201).json(teacher);
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
export const getMyFullProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const teacherId = req.user!.userId;

    const teacher = await TeacherService.getTeacherFullProfile(teacherId);

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
