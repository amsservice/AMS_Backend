import { Response } from 'express';
import { Types } from 'mongoose';
import { StudentService } from '../services/student.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { Session } from '../models/Session';
import fs from 'fs';
import csv from 'csv-parser';

/* 
   TEACHER: ADD STUDENT
 */
export const createStudent = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.userId;

  const result = await StudentService.createStudentByTeacher(
    teacherId,
    req.body
  );

  res.status(201).json(result);
};


export const bulkUploadStudentsSchoolWide = async (
  req: AuthRequest,
  res: Response
) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'CSV file required' });
  }

  const role = req.user!.role;
  if (role !== 'principal') {
    return res.status(403).json({ message: 'Only principal can upload whole-school students' });
  }

  const students: any[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  let rowIndex = 1;

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', row => {
          rowIndex++;

          const name = row.name?.trim();
          const admissionNo = row.admissionNo?.trim();
          const password = row.password;
          const rollNo = Number(row.rollNo);

          const classId = row.classId?.trim();
          const className = row.className?.trim() || row.class?.trim();
          const section = row.section?.trim();

          if (!name || !admissionNo || !password || Number.isNaN(rollNo)) {
            invalidRows.push({
              row: rowIndex,
              reason: 'Missing required fields'
            });
            return;
          }

          if (!classId && (!className || !section)) {
            invalidRows.push({
              row: rowIndex,
              reason: 'Missing classId or (className and section)'
            });
            return;
          }

          students.push({
            name,
            email: row.email?.trim() || undefined,
            password,
            admissionNo,
            fatherName: row.fatherName?.trim() || '',
            motherName: row.motherName?.trim() || '',
            parentsPhone: row.parentsPhone?.trim() || '',
            rollNo,
            classId: classId || undefined,
            className: className || undefined,
            section: section || undefined
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!students.length) {
      return res.status(400).json({
        message: 'No valid students found in CSV',
        invalidRows
      });
    }

    const result = await StudentService.bulkCreateStudentsSchoolWide(
      {
        schoolId: new Types.ObjectId(req.user!.schoolId)
      },
      students
    );

    return res.status(201).json({
      ...result,
      invalidRowsCount: invalidRows.length,
      invalidRows
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  } finally {
    fs.unlink(file.path, () => {});
  }
};


/* 
   TEACHER: UPDATE STUDENT PROFILE
*/
export const updateStudentByTeacher = async (
  req: AuthRequest,
  res: Response
) => {
  const teacherId = req.user!.userId;
  const studentId = req.params.id;

  const result = await StudentService.updateStudentByTeacher(
    teacherId,
    studentId,
    req.body
  );

  res.status(200).json(result);
};

/* 
   STUDENT: CHANGE OWN PASSWORD
 */
export const changeMyPassword = async (
  req: AuthRequest,
  res: Response
) => {
  const studentId = req.user!.userId;
  const { oldPassword, newPassword } = req.body;

  const result = await StudentService.changeMyPassword(
    studentId,
    oldPassword,
    newPassword
  );

  res.status(200).json(result);
};


export const getMyProfile = async (req: AuthRequest, res: Response) => {
  ;

  const student = await StudentService.getMyProfile(req.user!.userId);
  
    if (!student) {
      return res.status(404).json({
        message: "student not found"
      });
    }
  
    res.status(200).json({
      user: {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: "student"
      }
    });
};

/* =====================================================
   PRINCIPAL: TOTAL STUDENTS CLASS WISE
===================================================== */
export const getTotalStudentsClassWise = async (
  req: AuthRequest,
  res: Response
) => {
  const activeSession = await Session.findOne({
    schoolId: req.user!.schoolId,
    isActive: true
  });

  if (!activeSession) {
    res.json([]);
    return;
  }

  const result = await StudentService.getTotalStudentsClassWise(
    req.user!.schoolId as any,
    activeSession._id
  );

  res.json(result);
};

/* =====================================================
   TEACHER: MY STUDENTS list of students class wise
===================================================== */
export const getMyStudents = async (
  req: AuthRequest,
  res: Response
) => {
  const teacherId = req.user!.userId;

  const students = await StudentService.getMyStudents(teacherId);

  res.json(students);
};


export const getSchoolStudents = async (req: AuthRequest, res: Response) => {
  const role = req.user!.role;
  if (role !== 'principal') {
    return res.status(403).json({ message: 'Only principal can access students list' });
  }

  try {
    const students = await StudentService.getSchoolStudents(req.user!.schoolId!);
    return res.json(students);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

//bulk upload students
// bulk upload students (teacher + principal)
export const bulkUploadStudents = async (
  req: AuthRequest,
  res: Response
) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'CSV file required' });
  }

  const role = req.user!.role;

  if (role !== 'teacher' && role !== 'principal') {
    return res.status(403).json({
      message: 'Only teacher or principal can upload students'
    });
  }

  if (
    role === 'principal' &&
    (!req.body.classId || !req.body.className || !req.body.section)
  ) {
    return res.status(400).json({
      message: 'classId, className and section are required for principal'
    });
  }

  const students: any[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  let rowIndex = 1;

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', row => {
          rowIndex++;

          const name = row.name?.trim();
          const admissionNo = row.admissionNo?.trim();
          const password = row.password;
          const rollNo = Number(row.rollNo);

          if (!name || !admissionNo || !password || Number.isNaN(rollNo)) {
            invalidRows.push({
              row: rowIndex,
              reason: 'Missing required fields'
            });
            return;
          }

          students.push({
            name,
            email: row.email?.trim() || undefined,
            password,
            admissionNo,
            fatherName: row.fatherName?.trim() || '',
            motherName: row.motherName?.trim() || '',
            parentsPhone: row.parentsPhone?.trim() || '',
            rollNo
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!students.length) {
      return res.status(400).json({
        message: 'No valid students found in CSV',
        invalidRows
      });
    }

    const result = await StudentService.bulkCreateStudents(
      {
        role,
        userId: req.user!.userId,
        schoolId: new Types.ObjectId(req.user!.schoolId),
        classId: req.body.classId
          ? new Types.ObjectId(req.body.classId)
          : undefined,
        className: req.body.className,
        section: req.body.section
      },
      students
    );

    return res.status(201).json({
      ...result,
      invalidRowsCount: invalidRows.length,
      invalidRows
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  } finally {
    fs.unlink(file.path, () => {});
  }
};


// add student by principal
export const createStudentByPrincipal = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = await StudentService.createStudentByPrincipal(
      req.user!.schoolId!,
      req.body
    );

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
