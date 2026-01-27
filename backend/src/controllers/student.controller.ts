import { Response } from "express";
import { Types } from "mongoose";
import { StudentService } from "../services/student.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { Session } from "../models/Session";
import { Subscription } from "../models/Subscription";
import { Student } from "../models/Student";
import fs from "fs";
import csv from "csv-parser";

const buildDuplicateKeyMessage = (err: any) => {
  const keyPattern = err?.keyPattern ?? {};
  const keyValue = err?.keyValue ?? {};
  const keys = Object.keys(keyPattern);

  const raw = String(err?.errmsg || err?.message || err || "");

  // Try to extract from raw E11000 message when keyPattern/keyValue are missing
  // Examples:
  //  - E11000 duplicate key error collection: db.students index: admissionNo_1 dup key: { admissionNo: "ADM001" }
  //  - E11000 duplicate key error collection: ... dup key: { email: "a@b.com" }
  const rawDupKeyMatch = raw.match(/dup key:\s*\{\s*([^}]+)\s*\}/i);
  let rawField: string | undefined;
  let rawValue: string | undefined;
  if (rawDupKeyMatch?.[1]) {
    const inside = rawDupKeyMatch[1];
    const pairMatch = inside.match(/([A-Za-z0-9_.-]+)\s*:\s*(.*)/);
    if (pairMatch) {
      rawField = pairMatch[1];
      rawValue = pairMatch[2]
        ?.trim()
        .replace(/^"|"$/g, "")
        .replace(/^'|'$/g, "");
    }
  }

  // Prefer the actual "business" unique fields when compound indexes exist
  if (keys.includes("admissionNo") || rawField === "admissionNo") {
    const value = keyValue.admissionNo ?? rawValue;
    return `Admission number already exists${value !== undefined ? `: ${value}` : ""}`;
  }

  if (keys.includes("email") || rawField === "email") {
    const value = keyValue.email ?? rawValue;
    if (value === null || value === undefined || value === "") {
      return "Email already exists";
    }
    return `Email already exists: ${value}`;
  }

  if (rawField) {
    return `Duplicate value not allowed for ${rawField}${rawValue !== undefined ? `: ${rawValue}` : ""}`;
  }

  if (keys.length) {
    const details = keys
      .map((k) => (keyValue[k] !== undefined ? `${k}: ${keyValue[k]}` : k))
      .join(", ");
    return `Duplicate value not allowed for ${details}`;
  }

  return "Duplicate value not allowed";
};

export const bulkDeactivateStudents = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  if (!roles.includes('principal') && !roles.includes('coordinator')) {
    return res.status(403).json({ message: 'Only principal or coordinator can deactivate students' });
  }

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
        await StudentService.deactivateStudent(req.user!.schoolId!, id);
        return { id, ok: true };
      } catch (err: any) {
        return { id, ok: false, message: err?.message || 'Failed' };
      }
    })
  );

  const successCount = results.filter((r) => r.ok).length;
  return res.json({ success: true, successCount, results });
};

/* 
   TEACHER: ADD STUDENT
 */
export const createStudent = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.userId;

  try {
    const result = await StudentService.createStudentByTeacher(
      teacherId,
      req.body,
    );

    return res.status(201).json(result);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: buildDuplicateKeyMessage(err) });
    }
    return res.status(400).json({ message: err.message });
  }
};

export const getStudentsByClass = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res
      .status(403)
      .json({
        message: "Only principal and coordinator can access students list",
      });
  }

  const { classId } = req.params;
  if (!classId) {
    return res.status(400).json({ message: "classId is required" });
  }

  try {
    const students = await StudentService.getStudentsByClass(
      req.user!.schoolId!,
      classId,
    );
    return res.json(students);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res.status(403).json({ message: 'Only principal or coordinator can delete student' });
  }

  const studentId = req.params.id;
  if (!studentId) {
    return res.status(400).json({ message: 'Student id is required' });
  }

  try {
    const result = await StudentService.deactivateStudent(req.user!.schoolId!, studentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const deactivateStudent = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res.status(403).json({ message: 'Only principal or coordinator can deactivate student' });
  }

  const studentId = req.params.id;
  if (!studentId) {
    return res.status(400).json({ message: 'Student id is required' });
  }

  try {
    const result = await StudentService.deactivateStudent(req.user!.schoolId!, studentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const bulkUploadStudentsSchoolWide = async (
  req: AuthRequest,
  res: Response,
) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "CSV file required" });
  }

  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res
      .status(403)
      .json({
        message:
          "Only principal and coordinator can upload whole-school students",
      });
  }

  const students: any[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  let rowIndex = 1;

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (row) => {
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
              reason: "Missing required fields",
            });
            return;
          }

          if (!classId && (!className || !section)) {
            invalidRows.push({
              row: rowIndex,
              reason: "Missing classId or (className and section)",
            });
            return;
          }

          students.push({
            name,
            email: row.email?.trim() || undefined,
            password,
            admissionNo,
            fatherName: row.fatherName?.trim() || "",
            motherName: row.motherName?.trim() || "",
            parentsPhone: row.parentsPhone?.trim() || "",
            rollNo,
            classId: classId || undefined,
            className: className || undefined,
            section: section || undefined,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!students.length) {
      return res.status(400).json({
        message: "No valid students found in CSV",
        invalidRows,
      });
    }

    const subscription = await Subscription.findOne({
      schoolId: req.user!.schoolId,
      status: { $in: ["active", "grace"] },
    }).select("billableStudents");

    if (!subscription) {
      return res.status(403).json({
        message: "No active subscription",
      });
    }

    const currentCount = await Student.countDocuments({
      schoolId: req.user!.schoolId,
      status: "active",
    });

    if (currentCount + students.length > subscription.billableStudents) {
      return res.status(403).json({
        message: `Student limit reached. You can add only ${Math.max(0, subscription.billableStudents - currentCount)} more students.`,
      });
    }

    const result = await StudentService.bulkCreateStudentsSchoolWide(
      {
        schoolId: new Types.ObjectId(req.user!.schoolId),
      },
      students,
    );

    if (!result?.success) {
      return res.status(400).json({
        message: "CSV validation failed",
        ...(result as any),
        invalidRowsCount: invalidRows.length,
        invalidRows,
      });
    }

    return res.status(201).json({
      ...result,
      invalidRowsCount: invalidRows.length,
      invalidRows,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: buildDuplicateKeyMessage(err) });
    }
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
  res: Response,
) => {
  const teacherId = req.user!.userId;
  const studentId = req.params.id;

  const result = await StudentService.updateStudentByTeacher(
    teacherId,
    studentId,
    req.body,
  );

  res.status(200).json(result);
};

/* 
   STUDENT: CHANGE OWN PASSWORD
 */
export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  const studentId = req.user!.userId;
  const { oldPassword, newPassword } = req.body;

  const result = await StudentService.changeMyPassword(
    studentId,
    oldPassword,
    newPassword,
  );

  res.status(200).json(result);
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const student = await StudentService.getMyProfile(req.user!.userId);

  if (!student) {
    return res.status(404).json({
      message: "student not found",
    });
  }

  res.status(200).json({
    user: {
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      role: "student",
    },
  });
};

/* =====================================================
   PRINCIPAL: TOTAL STUDENTS CLASS WISE
===================================================== */
export const getTotalStudentsClassWise = async (
  req: AuthRequest,
  res: Response,
) => {
  const activeSession = await Session.findOne({
    schoolId: req.user!.schoolId,
    isActive: true,
  });

  if (!activeSession) {
    res.json([]);
    return;
  }

  const result = await StudentService.getTotalStudentsClassWise(
    req.user!.schoolId as any,
    activeSession._id,
  );

  res.json(result);
};

/* =====================================================
   TEACHER: MY STUDENTS list of students class wise
===================================================== */
export const getMyStudents = async (req: AuthRequest, res: Response) => {
  const teacherId = req.user!.userId;

  const students = await StudentService.getMyStudents(teacherId);

  res.json(students);
};

export const getSchoolStudents = async (req: AuthRequest, res: Response) => {
  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res
      .status(403)
      .json({
        message: "Only principal and coordinator can access students list",
      });
  }

  try {
    const students = await StudentService.getSchoolStudents(
      req.user!.schoolId!,
    );
    return res.json(students);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

//bulk upload students
// bulk upload students (teacher + principal)
export const bulkUploadStudents = async (req: AuthRequest, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "CSV file required" });
  }

  const role = req.user!.roles;

  if (
    !role.includes("teacher") &&
    !role.includes("coordinator") &&
    !role.includes("principal")
  ) {
    return res.status(403).json({
      message: "Only teacher, coordinator or principal can upload students",
    });
  }

  if (
    role.includes("principal") &&
    (!req.body.classId || !req.body.className || !req.body.section)
  ) {
    return res.status(400).json({
      message: "classId, className and section are required for principal",
    });
  }

  const students: any[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  let rowIndex = 1;

  try {
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (row) => {
          rowIndex++;

          const name = row.name?.trim();
          const admissionNo = row.admissionNo?.trim();
          const password = row.password;
          const rollNo = Number(row.rollNo);

          if (!name || !admissionNo || !password || Number.isNaN(rollNo)) {
            invalidRows.push({
              row: rowIndex,
              reason: "Missing required fields",
            });
            return;
          }

          students.push({
            name,
            email: row.email?.trim() || undefined,
            password,
            admissionNo,
            fatherName: row.fatherName?.trim() || "",
            motherName: row.motherName?.trim() || "",
            parentsPhone: row.parentsPhone?.trim() || "",
            rollNo,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!students.length) {
      return res.status(400).json({
        message: "No valid students found in CSV",
        invalidRows,
      });
    }

    const subscription = await Subscription.findOne({
      schoolId: req.user!.schoolId,
      status: { $in: ["active", "grace"] },
    }).select("billableStudents");

    if (!subscription) {
      return res.status(403).json({
        message: "No active subscription",
      });
    }

    const currentCount = await Student.countDocuments({
      schoolId: req.user!.schoolId,
      status: "active",
    });

    if (currentCount + students.length > subscription.billableStudents) {
      return res.status(403).json({
        message: `Student limit reached. You can add only ${Math.max(0, subscription.billableStudents - currentCount)} more students.`,
      });
    }

    const result = await StudentService.bulkCreateStudents(
      {
        roles: req.user!.roles,
        userId: req.user!.userId,
        schoolId: new Types.ObjectId(req.user!.schoolId),
        classId: req.body.classId
          ? new Types.ObjectId(req.body.classId)
          : undefined,
        className: req.body.className,
        section: req.body.section,
      },
      students,
    );

    return res.status(201).json({
      ...result,
      invalidRowsCount: invalidRows.length,
      invalidRows,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: buildDuplicateKeyMessage(err) });
    }
    return res.status(400).json({ message: err.message });
  } finally {
    fs.unlink(file.path, () => {});
  }
};

// add student by principal
export const createStudentByPrincipal = async (
  req: AuthRequest,
  res: Response,
) => {
  const roles = req.user!.roles;
  if (!roles.includes("principal") && !roles.includes("coordinator")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const result = await StudentService.createStudentByPrincipal(
      req.user!.schoolId!,
      req.body,
    );

    res.status(201).json(result);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: buildDuplicateKeyMessage(err) });
    }
    res.status(400).json({ message: err.message });
  }
};

/* =====================================================
   GET FULL STUDENT DETAILS
   principal | teacher | student
===================================================== */
export const getStudentById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { roles, userId, schoolId } = req.user!;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid student id" });
  }

  try {
    let student;

    if (roles.includes('principal') || roles.includes('coordinator')) {
      student = await StudentService.getStudentForPrincipal(schoolId!, id);
    }

    if (roles.includes('teacher')) {
      student = await StudentService.getStudentForTeacher(userId, id);
    }

    if (roles.includes("student")) {
      if (userId !== id) {
        return res.status(403).json({
          message: "Students can only access their own profile",
        });
      }
      student = await StudentService.getStudentForStudent(id);
    }

    if (!student) {
      return res.status(404).json({
        message: "Student not found or access denied",
      });
    }

    return res.json(student);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};
