import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type StaffRole = "teacher" | "coordinator";

export interface TeacherSessionHistory {
  sessionId: Types.ObjectId;
  classId: Types.ObjectId;
  className: string;
  section: string;
  isActive: boolean;
}

export interface RoleHistoryEntry {
  roles: ("teacher" | "coordinator")[];
  sessionId: Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

export interface TeacherSubstitution {
  originalTeacherId: Types.ObjectId;
  originalTeacherName: string;

  classId: Types.ObjectId;
  className: string;
  section: string;

  substituteTeacherId: Types.ObjectId;
  substituteTeacherName: string;

  startDate: Date;
  endDate: Date;

  sessionId: Types.ObjectId;

  assignedBy: Types.ObjectId;
  assignedAt: Date;

  reason?: string;
  isActive: boolean;
}

const RoleHistorySchema = new Schema<RoleHistoryEntry>(
  {
    roles: {
      type: [String],
      enum: ["teacher", "coordinator"],
      required: true,
    },

    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false },
);

export interface StaffDoc extends Document {
  name: string;
  email: string;
  password: string;
  schoolId: Types.ObjectId;
  phone: string;
  dob: Date;
  gender: "male" | "female" | "other";
  highestQualification?: string;
  experienceYears?: number;
  address?: string;
  isActive: boolean;
  leftAt?: Date;
  substitutions: TeacherSubstitution[];
  roles: StaffRole[];
  roleHistory: RoleHistoryEntry[];

  history: TeacherSessionHistory[];

  comparePassword(candidate: string): Promise<boolean>;
}

const SubstitutionSchema = new Schema<TeacherSubstitution>(
  {
    originalTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    originalTeacherName: {
      type: String,
      required: true,
    },

    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    className: String,
    section: String,

    substituteTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    substituteTeacherName: {
      type: String,
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    reason: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const TeacherSessionSchema = new Schema<TeacherSessionHistory>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    className: { type: String, required: true },
    section: { type: String, required: true },
    isActive: { type: Boolean, default: false },
  },
  { _id: false },
);


const StaffSchema = new Schema<StaffDoc>(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Phone must be exactly 10 digits"],
    },

    dob: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    highestQualification: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    experienceYears: {
      type: Number,
      min: 0,
      max: 42,
    },

    address: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    leftAt: {
      type: Date,
    },

    history: {
      type: [TeacherSessionSchema],
      default: [],
    },
    roles: {
      type: [String],
      enum: ["teacher", "coordinator"],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one role is required",
      },
      index: true,
    },

    roleHistory: {
      type: [RoleHistorySchema],
      default: [],
    },
    substitutions: {
      type: [SubstitutionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ======================================================
   VIRTUAL: CURRENT CLASS
====================================================== */
StaffSchema.virtual("currentClass").get(function () {
  return this.history.find((h) => h.isActive);
});
StaffSchema.virtual("isTeacher").get(function () {
  return this.roles.includes("teacher");
});

StaffSchema.virtual("isCoordinator").get(function () {
  return this.roles.includes("coordinator");
});


/* ======================================================
   PASSWORD HASHING
====================================================== */
StaffSchema.pre("save", async function (this: StaffDoc) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

StaffSchema.pre("save", function (this: StaffDoc) {
  if (!this.isModified("roles")) return;

  if (!this.roles || this.roles.length === 0) {
    throw new Error("Staff must have at least one role");
  }

  if ((this as any)._roleSessionId) {
    this.roleHistory.push({
      roles: [...this.roles],
      sessionId: (this as any)._roleSessionId,
      changedAt: new Date(),
    });
  }
});


/* ======================================================
   PASSWORD COMPARISON  ✅ ADD THIS
====================================================== */
StaffSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const Staff = model<StaffDoc>("Staff", StaffSchema);

