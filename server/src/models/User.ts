import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "doctor" | "patient";

export interface IUserHealthMetrics {
  digestion?: number;
  sleepQuality?: number;
  energyLevel?: number;
  lastUpdatedAt?: Date;
}

export interface IUserTreatmentProfile {
  currentDayNumber: number;
  cycleLength: number;
  startedAt?: Date;
  lastProgressAt?: Date;
  lastCompletedAppointment?: Types.ObjectId;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedDoctor?: Types.ObjectId;
  emailVerified: boolean;
  healthMetrics?: IUserHealthMetrics;
  treatmentProfile?: IUserTreatmentProfile;
}

const HealthMetricsSchema = new Schema<IUserHealthMetrics>(
  {
    digestion: { type: Number, min: 1, max: 5 },
    sleepQuality: { type: Number, min: 1, max: 5 },
    energyLevel: { type: Number, min: 1, max: 5 },
    lastUpdatedAt: { type: Date },
  },
  { _id: false },
);

const TreatmentProfileSchema = new Schema<IUserTreatmentProfile>(
  {
    currentDayNumber: { type: Number, min: 1, max: 21, default: 1 },
    cycleLength: { type: Number, min: 1, default: 21 },
    startedAt: { type: Date },
    lastProgressAt: { type: Date },
    lastCompletedAppointment: { type: Schema.Types.ObjectId, ref: "Therapy" },
  },
  { _id: false },
);

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["doctor", "patient"], required: true },
    assignedDoctor: { type: Schema.Types.ObjectId, ref: "User" },
    emailVerified: { type: Boolean, default: true },
    healthMetrics: { type: HealthMetricsSchema, default: undefined },
    treatmentProfile: { type: TreatmentProfileSchema, default: undefined },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
