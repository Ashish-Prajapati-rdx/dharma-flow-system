import { Router, type RequestHandler } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Therapy from "../models/Therapy";
import User from "../models/User";

interface AuthTokenPayload {
  userId: string;
  role: string;
}

const router = Router();

const isValidObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const parseTimeToMinutes = (time: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;

  const [, hours, minutes] = match;
  return Number(hours) * 60 + Number(minutes);
};

const overlaps = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean => startA < endB && startB < endA;

const getDoctorIdFromRequest = (
  req: Parameters<RequestHandler>[0],
): string | undefined => {
  const queryDoctorId = req.query.doctorId;
  if (isValidObjectId(queryDoctorId)) return queryDoctorId;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return undefined;

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    return payload.role === "doctor" && isValidObjectId(payload.userId)
      ? payload.userId
      : undefined;
  } catch {
    return undefined;
  }
};

// POST /api/appointments/new - Create a new appointment
router.post("/new", async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      therapyName,
      time,
      duration,
      room,
      doctorId,
    } = req.body;
    const numericDuration = Number(duration);
    const startMinutes =
      typeof time === "string" ? parseTimeToMinutes(time) : null;

    // Validation
    if (
      !isValidObjectId(patientId) ||
      !isValidObjectId(doctorId) ||
      typeof therapyName !== "string" ||
      !therapyName.trim() ||
      startMinutes === null ||
      !Number.isFinite(numericDuration) ||
      numericDuration <= 0 ||
      typeof room !== "string" ||
      !room.trim()
    ) {
      res.status(400).json({ message: "Invalid appointment details." });
      return;
    }

    // Verify patient and doctor exist
    const [patient, doctor] = await Promise.all([
      User.findOne({ _id: patientId, role: "patient" }),
      User.findOne({ _id: doctorId, role: "doctor" }),
    ]);

    if (!patient) {
      res.status(404).json({ message: "Patient not found." });
      return;
    }

    if (!doctor) {
      res.status(404).json({ message: "Doctor not found." });
      return;
    }

    // Check for room conflicts
    const roomSchedules = await Therapy.find({
      room: room.trim(),
      status: "Scheduled",
    });

    const requestedEnd = startMinutes + numericDuration;
    const conflictingTherapy = roomSchedules.find((therapy) => {
      const existingStart = parseTimeToMinutes(therapy.time);
      if (existingStart === null) return false;

      return overlaps(
        startMinutes,
        requestedEnd,
        existingStart,
        existingStart + therapy.duration,
      );
    });

    if (conflictingTherapy) {
      res.status(409).json({
        message: `Room Conflict! ${room} is already booked at ${conflictingTherapy.time}.`,
      });
      return;
    }

    // Create appointment
    const therapy = await Therapy.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      therapyName: therapyName.trim(),
      time,
      duration: numericDuration,
      room: room.trim(),
      status: "Scheduled",
    });

    // Populate and return
    const populatedTherapy = await therapy.populate([
      { path: "patientId", select: "name email role assignedDoctor" },
      { path: "doctorId", select: "name email role" },
    ]);

    const responseData = populatedTherapy.toObject
      ? populatedTherapy.toObject()
      : populatedTherapy;

    console.log("✅ Appointment created:", {
      appointmentId: therapy._id,
      therapyName: therapy.therapyName,
      patientId: responseData.patientId,
    });

    res.status(201).json(responseData);
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/appointments/doctor/:doctorId - Get all sessions for doctor today
router.get("/doctor/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!isValidObjectId(doctorId)) {
      res.status(400).json({ message: "Invalid doctor ID." });
      return;
    }

    const therapies = await Therapy.find({
      doctorId,
      status: "Scheduled",
    })
      .populate("patientId", "name email role assignedDoctor")
      .populate("doctorId", "name email role")
      .sort({ time: 1 })
      .lean();

    console.log(`📋 Fetching appointments for doctor ${doctorId}:`, therapies);
    res.json(therapies);
  } catch (error) {
    console.error("Fetch doctor appointments error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/appointments/patient/:patientId - Get all sessions for patient
router.get("/patient/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: "Invalid patient ID." });
      return;
    }

    const therapies = await Therapy.find({
      patientId,
      status: "Scheduled",
    })
      .populate("patientId", "name email role assignedDoctor")
      .populate("doctorId", "name email role")
      .sort({ time: 1 })
      .lean();

    res.json(therapies);
  } catch (error) {
    console.error("Fetch patient appointments error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
