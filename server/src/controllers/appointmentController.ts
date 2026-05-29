import type { RequestHandler } from "express";
import mongoose from "mongoose";
import Therapy, {
  type ITherapy,
  type TreatmentStatus,
} from "../models/Therapy.js";
import User from "../models/User.js";
import {
  buildSlotLocks,
  formatSystemDate,
  isAppointmentDate,
  normalizeTimeSlot,
  timeSlotToMinutes,
  timeSlotToTwentyFourHour,
} from "../utils/appointmentTime.js";
import { queueAppointmentNotificationEmail } from "../utils/emailService.js";

const ACTIVE_TREATMENT_STATUSES: TreatmentStatus[] = ["scheduled", "ongoing"];
const POPULATE_PATIENT =
  "name email role assignedDoctor emailVerified healthMetrics treatmentProfile";
const POPULATE_DOCTOR = "name email role";

interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  therapyName: string;
  appointmentDate: string;
  timeSlot: string;
  duration: number;
  room: string;
  currentDayNumber?: number;
}

interface ProgressInput {
  digestion: number;
  sleepQuality: number;
  energyLevel: number;
  notes?: string;
  metricDate?: string;
}

const isValidObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const clampCycleDay = (value: number): number =>
  Math.min(Math.max(Math.trunc(value), 1), 21);

const isTreatmentStatus = (value: unknown): value is TreatmentStatus =>
  value === "scheduled" ||
  value === "ongoing" ||
  value === "completed" ||
  value === "missed";

const isScaleValue = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 5;

const isMongoDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: number }).code === 11000;

const legacyStatusFor = (status: TreatmentStatus): "Scheduled" | "Completed" =>
  status === "completed" ? "Completed" : "Scheduled";

const parseCreateAppointmentBody = (
  body: unknown,
): CreateAppointmentInput | null => {
  if (typeof body !== "object" || body === null) return null;
  const data = body as Record<string, unknown>;

  const patientId = data.patientId;
  const doctorId = data.doctorId;
  const therapyName = data.therapyName;
  const room = data.room;
  const duration = Number(data.duration);
  const timeSlot = normalizeTimeSlot(data.timeSlot ?? data.time);
  const appointmentDate =
    data.appointmentDate === undefined
      ? formatSystemDate()
      : isAppointmentDate(data.appointmentDate)
        ? data.appointmentDate
        : null;
  const currentDayNumber =
    typeof data.currentDayNumber === "number" &&
    Number.isFinite(data.currentDayNumber)
      ? clampCycleDay(data.currentDayNumber)
      : undefined;

  if (
    !isValidObjectId(patientId) ||
    !isValidObjectId(doctorId) ||
    typeof therapyName !== "string" ||
    !therapyName.trim() ||
    typeof room !== "string" ||
    !room.trim() ||
    !appointmentDate ||
    !timeSlot ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null;
  }

  return {
    patientId,
    doctorId,
    therapyName: therapyName.trim(),
    appointmentDate,
    timeSlot,
    duration,
    room: room.trim(),
    currentDayNumber,
  };
};

const parseProgressBody = (body: unknown): ProgressInput | null => {
  if (typeof body !== "object" || body === null) return null;
  const data = body as Record<string, unknown>;

  const digestion = Number(data.digestion);
  const sleepQuality = Number(data.sleepQuality);
  const energyLevel = Number(data.energyLevel);
  const notes = typeof data.notes === "string" ? data.notes.trim() : undefined;
  const metricDate =
    data.metricDate === undefined
      ? undefined
      : isAppointmentDate(data.metricDate)
        ? data.metricDate
        : null;

  if (
    !isScaleValue(digestion) ||
    !isScaleValue(sleepQuality) ||
    !isScaleValue(energyLevel) ||
    metricDate === null
  ) {
    return null;
  }

  return {
    digestion,
    sleepQuality,
    energyLevel,
    notes,
    metricDate,
  };
};

const populateAppointment = (query: mongoose.Query<unknown, unknown>) =>
  query
    .populate("patientId", POPULATE_PATIENT)
    .populate("doctorId", POPULATE_DOCTOR);

const queuePatientAppointmentEmail = (
  appointment: ITherapy,
  kind: "scheduled" | "completed",
  patient: { name: string; email?: string },
  doctor: { name: string },
): void => {
  queueAppointmentNotificationEmail(
    {
      patientEmail: patient.email,
      patientName: patient.name,
      doctorName: doctor.name,
      therapyName: appointment.therapyName,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      currentDayNumber: appointment.currentDayNumber,
    },
    kind,
  );
};

const advancePatientCycleAfterCompletion = async (
  appointment: ITherapy,
): Promise<void> => {
  const nextDayNumber = clampCycleDay(appointment.currentDayNumber + 1);

  await User.updateOne(
    { _id: appointment.patientId, role: "patient" },
    {
      $max: { "treatmentProfile.currentDayNumber": nextDayNumber },
      $set: {
        "treatmentProfile.cycleLength": 21,
        "treatmentProfile.lastCompletedAppointment": appointment._id,
        "treatmentProfile.lastProgressAt": new Date(),
      },
    },
  );
};

const findSchedulingConflict = async ({
  doctorId,
  appointmentDate,
  room,
  slotLocks,
}: Pick<CreateAppointmentInput, "doctorId" | "appointmentDate" | "room"> & {
  slotLocks: string[];
}) =>
  Therapy.findOne({
    appointmentDate,
    treatmentStatus: { $in: ACTIVE_TREATMENT_STATUSES },
    slotLocks: { $in: slotLocks },
    $or: [{ room }, { doctorId }],
  })
    .select("+slotLocks")
    .lean();

export const createAppointment: RequestHandler = async (req, res) => {
  try {
    const input = parseCreateAppointmentBody(req.body);
    if (!input) {
      res.status(400).json({
        message:
          "Valid patientId, doctorId, therapyName, appointmentDate, timeSlot, duration, and room are required.",
      });
      return;
    }

    const startMinutes = timeSlotToMinutes(input.timeSlot);
    const slotLocks = buildSlotLocks(input.timeSlot, input.duration);
    if (startMinutes === null || slotLocks.length === 0) {
      res.status(400).json({ message: "Invalid time slot or duration." });
      return;
    }

    const [patient, doctor] = await Promise.all([
      User.findOne({ _id: input.patientId, role: "patient" }).select(
        "name email role assignedDoctor treatmentProfile",
      ),
      User.findOne({ _id: input.doctorId, role: "doctor" }).select(
        "name email role",
      ),
    ]);

    if (!patient) {
      res.status(404).json({ message: "Patient not found." });
      return;
    }

    if (!doctor) {
      res.status(404).json({ message: "Doctor not found." });
      return;
    }

    const conflict = await findSchedulingConflict({
      doctorId: input.doctorId,
      appointmentDate: input.appointmentDate,
      room: input.room,
      slotLocks,
    });

    if (conflict) {
      res.status(409).json({
        message:
          conflict.room === input.room
            ? `${input.room} is already booked during this time.`
            : `${doctor.name} already has a session during this time.`,
      });
      return;
    }

    const existingCycleCount = await Therapy.countDocuments({
      patientId: input.patientId,
      treatmentStatus: { $ne: "missed" },
    });
    const patientCycleDay = patient.treatmentProfile?.currentDayNumber ?? 1;
    const currentDayNumber =
      input.currentDayNumber ??
      clampCycleDay(Math.max(patientCycleDay, existingCycleCount + 1));

    const appointment = await Therapy.create({
      patientId: new mongoose.Types.ObjectId(input.patientId),
      doctorId: new mongoose.Types.ObjectId(input.doctorId),
      therapyName: input.therapyName,
      appointmentDate: input.appointmentDate,
      timeSlot: input.timeSlot,
      time: timeSlotToTwentyFourHour(input.timeSlot),
      duration: input.duration,
      room: input.room,
      treatmentStatus: "scheduled",
      status: "Scheduled",
      currentDayNumber,
      startMinutes,
      endMinutes: startMinutes + input.duration,
      slotLocks,
      progressTracking: {
        cycleLength: 21,
        dailyMetrics: [],
      },
    });

    await User.updateOne(
      {
        _id: patient._id,
        role: "patient",
        "treatmentProfile.currentDayNumber": { $exists: false },
      },
      {
        $set: {
          "treatmentProfile.currentDayNumber": 1,
          "treatmentProfile.cycleLength": 21,
          "treatmentProfile.startedAt": new Date(),
        },
      },
    );

    const populatedAppointment = await populateAppointment(
      Therapy.findById(appointment._id),
    ).lean();

    queuePatientAppointmentEmail(appointment, "scheduled", patient, doctor);
    res.status(201).json(populatedAppointment);
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      res.status(409).json({
        message:
          "Scheduling conflict detected. This room or doctor is already booked for the selected slot.",
      });
      return;
    }

    console.error("Create appointment error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getDoctorAppointments: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isValidObjectId(doctorId)) {
      res.status(400).json({ message: "Invalid doctor ID." });
      return;
    }

    const appointments = await populateAppointment(
      Therapy.find({ doctorId }).sort({
        appointmentDate: 1,
        startMinutes: 1,
      }),
    ).lean();

    res.json(appointments);
  } catch (error) {
    console.error("Fetch doctor appointments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getDoctorTodayAppointments: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isValidObjectId(doctorId)) {
      res.status(400).json({ message: "Invalid doctor ID." });
      return;
    }

    const today = formatSystemDate();
    const appointments = await populateAppointment(
      Therapy.find({ doctorId, appointmentDate: today }).sort({
        startMinutes: 1,
      }),
    ).lean();

    res.json(appointments);
  } catch (error) {
    console.error("Fetch today's doctor appointments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getPatientAppointments: RequestHandler = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: "Invalid patient ID." });
      return;
    }

    const appointments = await populateAppointment(
      Therapy.find({ patientId }).sort({
        currentDayNumber: 1,
        appointmentDate: 1,
        startMinutes: 1,
      }),
    ).lean();

    res.json(appointments);
  } catch (error) {
    console.error("Fetch patient appointments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const updateAppointmentStatus: RequestHandler = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const status =
      (req.body as { treatmentStatus?: unknown; status?: unknown })
        .treatmentStatus ?? (req.body as { status?: unknown }).status;

    if (!isValidObjectId(appointmentId)) {
      res.status(400).json({ message: "Invalid appointment ID." });
      return;
    }

    if (!isTreatmentStatus(status)) {
      res.status(400).json({
        message:
          "treatmentStatus must be one of scheduled, ongoing, completed, or missed.",
      });
      return;
    }

    const existing = await Therapy.findById(appointmentId);
    if (!existing) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }

    const previousStatus = existing.treatmentStatus;
    const now = new Date();
    const statusUpdate: Partial<
      Pick<ITherapy, "treatmentStatus" | "status" | "completedAt" | "missedAt">
    > = {
      treatmentStatus: status,
      status: legacyStatusFor(status),
    };

    if (status === "completed") statusUpdate.completedAt = now;
    if (status === "missed") statusUpdate.missedAt = now;

    const updated = await Therapy.findOneAndUpdate(
      {
        _id: appointmentId,
        treatmentStatus: previousStatus,
      },
      {
        $set: statusUpdate,
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      res.status(409).json({
        message:
          "Appointment status changed while this request was processing. Please refresh and try again.",
      });
      return;
    }

    if (status === "completed" && previousStatus !== "completed") {
      await advancePatientCycleAfterCompletion(updated);

      const [patient, doctor] = await Promise.all([
        User.findById(updated.patientId).select("name email"),
        User.findById(updated.doctorId).select("name"),
      ]);

      if (patient && doctor) {
        queuePatientAppointmentEmail(updated, "completed", patient, doctor);
      }
    }

    const populatedAppointment = await populateAppointment(
      Therapy.findById(updated._id),
    ).lean();

    res.json(populatedAppointment);
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const upsertAppointmentProgress: RequestHandler = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!isValidObjectId(appointmentId)) {
      res.status(400).json({ message: "Invalid appointment ID." });
      return;
    }

    const input = parseProgressBody(req.body);
    if (!input) {
      res.status(400).json({
        message:
          "digestion, sleepQuality, and energyLevel must be whole numbers from 1 to 5.",
      });
      return;
    }

    const appointment = await Therapy.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }

    const metricDate = input.metricDate ?? appointment.appointmentDate;
    const metric = {
      dayNumber: appointment.currentDayNumber,
      appointmentDate: metricDate,
      digestion: input.digestion,
      sleepQuality: input.sleepQuality,
      energyLevel: input.energyLevel,
      notes: input.notes,
      recordedAt: new Date(),
    };

    const existingMetric = await Therapy.updateOne(
      {
        _id: appointmentId,
        "progressTracking.dailyMetrics.appointmentDate": metricDate,
      },
      {
        $set: {
          "progressTracking.dailyMetrics.$.dayNumber": metric.dayNumber,
          "progressTracking.dailyMetrics.$.digestion": metric.digestion,
          "progressTracking.dailyMetrics.$.sleepQuality": metric.sleepQuality,
          "progressTracking.dailyMetrics.$.energyLevel": metric.energyLevel,
          "progressTracking.dailyMetrics.$.notes": metric.notes,
          "progressTracking.dailyMetrics.$.recordedAt": metric.recordedAt,
          "progressTracking.lastCheckedAt": metric.recordedAt,
        },
      },
    );

    if (existingMetric.matchedCount === 0) {
      await Therapy.updateOne(
        {
          _id: appointmentId,
          "progressTracking.dailyMetrics.appointmentDate": { $ne: metricDate },
        },
        {
          $push: { "progressTracking.dailyMetrics": metric },
          $set: { "progressTracking.lastCheckedAt": metric.recordedAt },
        },
      );
    }

    await User.updateOne(
      { _id: appointment.patientId, role: "patient" },
      {
        $set: {
          "healthMetrics.digestion": input.digestion,
          "healthMetrics.sleepQuality": input.sleepQuality,
          "healthMetrics.energyLevel": input.energyLevel,
          "healthMetrics.lastUpdatedAt": metric.recordedAt,
          "treatmentProfile.lastProgressAt": metric.recordedAt,
        },
      },
    );

    const updatedAppointment = await populateAppointment(
      Therapy.findById(appointmentId),
    ).lean();

    res.json(updatedAppointment);
  } catch (error) {
    console.error("Upsert appointment progress error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const deleteAppointment: RequestHandler = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!isValidObjectId(appointmentId)) {
      res.status(400).json({ message: "Invalid appointment ID." });
      return;
    }

    const deleted = await Therapy.findByIdAndDelete(appointmentId);
    if (!deleted) {
      res.status(404).json({ message: "Appointment not found." });
      return;
    }

    res.json({ message: "Appointment cancelled successfully." });
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
