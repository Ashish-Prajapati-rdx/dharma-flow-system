import mongoose, { Document, Schema, Types } from "mongoose";
import {
  buildSlotLocks,
  formatSystemDate,
  normalizeTimeSlot,
  timeSlotToMinutes,
  timeSlotToTwentyFourHour,
} from "../utils/appointmentTime.js";

export type TreatmentStatus = "scheduled" | "ongoing" | "completed" | "missed";

export interface DailyProgressMetric {
  dayNumber: number;
  appointmentDate: string;
  digestion: number;
  sleepQuality: number;
  energyLevel: number;
  notes?: string;
  recordedAt: Date;
}

export interface ProgressTracking {
  cycleLength: number;
  dailyMetrics: DailyProgressMetric[];
  lastCheckedAt?: Date;
}

export interface ITherapy extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  therapyName: string;
  appointmentDate: string;
  timeSlot: string;
  time: string;
  duration: number;
  room: string;
  treatmentStatus: TreatmentStatus;
  status?: "Scheduled" | "Completed";
  currentDayNumber: number;
  progressTracking: ProgressTracking;
  startMinutes: number;
  endMinutes: number;
  slotLocks: string[];
  completedAt?: Date;
  missedAt?: Date;
}

const DailyProgressMetricSchema = new Schema<DailyProgressMetric>(
  {
    dayNumber: { type: Number, required: true, min: 1, max: 21 },
    appointmentDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    digestion: { type: Number, required: true, min: 1, max: 5 },
    sleepQuality: { type: Number, required: true, min: 1, max: 5 },
    energyLevel: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, trim: true, maxlength: 2000 },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProgressTrackingSchema = new Schema<ProgressTracking>(
  {
    cycleLength: { type: Number, min: 1, default: 21 },
    dailyMetrics: { type: [DailyProgressMetricSchema], default: [] },
    lastCheckedAt: { type: Date },
  },
  { _id: false },
);

const TherapySchema: Schema = new Schema<ITherapy>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    therapyName: { type: String, required: true, trim: true },
    appointmentDate: {
      type: String,
      required: true,
      default: () => formatSystemDate(),
      match: /^\d{4}-\d{2}-\d{2}$/,
      trim: true,
    },
    timeSlot: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    room: { type: String, required: true, trim: true },
    treatmentStatus: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "missed"],
      default: "scheduled",
    },
    status: { type: String, enum: ["Scheduled", "Completed"] },
    currentDayNumber: { type: Number, min: 1, max: 21, default: 1 },
    progressTracking: { type: ProgressTrackingSchema, default: () => ({}) },
    startMinutes: { type: Number, required: true, min: 0, max: 1439 },
    endMinutes: { type: Number, required: true, min: 1 },
    slotLocks: { type: [String], required: true, select: false },
    completedAt: { type: Date },
    missedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

TherapySchema.pre("validate", function deriveAppointmentFields() {
  const doc = this as unknown as ITherapy;
  const normalizedSlot = normalizeTimeSlot(doc.timeSlot || doc.time);

  if (normalizedSlot) {
    doc.timeSlot = normalizedSlot;
    doc.time = timeSlotToTwentyFourHour(normalizedSlot);
  }

  const startMinutes = timeSlotToMinutes(doc.timeSlot);
  if (startMinutes !== null) {
    doc.startMinutes = startMinutes;
    doc.endMinutes = startMinutes + doc.duration;
    doc.slotLocks = buildSlotLocks(doc.timeSlot, doc.duration);
  }

  doc.status = doc.treatmentStatus === "completed" ? "Completed" : "Scheduled";
});

TherapySchema.index({ doctorId: 1, appointmentDate: 1, startMinutes: 1 });
TherapySchema.index({ patientId: 1, appointmentDate: 1, currentDayNumber: 1 });
TherapySchema.index({ appointmentDate: 1, treatmentStatus: 1 });
TherapySchema.index(
  { appointmentDate: 1, room: 1, slotLocks: 1 },
  {
    unique: true,
    partialFilterExpression: {
      treatmentStatus: { $in: ["scheduled", "ongoing"] },
    },
  },
);
TherapySchema.index(
  { appointmentDate: 1, doctorId: 1, slotLocks: 1 },
  {
    unique: true,
    partialFilterExpression: {
      treatmentStatus: { $in: ["scheduled", "ongoing"] },
    },
  },
);

export default mongoose.model<ITherapy>("Therapy", TherapySchema);
