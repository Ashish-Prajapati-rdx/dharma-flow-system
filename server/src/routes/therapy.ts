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

router.get("/all", async (req, res) => {
  try {
    const doctorId = getDoctorIdFromRequest(req);
    if (!doctorId) {
      res.status(400).json({ message: "Valid doctorId is required." });
      return;
    }

    const therapies = await Therapy.find({ doctorId })
      .populate("patientId", "name email role assignedDoctor")
      .populate("doctorId", "name email role")
      .sort({ time: 1 });

    res.json(therapies);
  } catch (error) {
    console.error("Fetch therapies error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/schedule", async (req, res) => {
  try {
    const { patientId, doctorId, therapyName, time, duration, room } = req.body;
    const numericDuration = Number(duration);
    const startMinutes =
      typeof time === "string" ? parseTimeToMinutes(time) : null;

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
      res.status(400).json({ message: "Invalid therapy schedule details." });
      return;
    }

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
        message: `Room ${room} is already booked at ${conflictingTherapy.time}.`,
      });
      return;
    }

    const therapy = await Therapy.create({
      patientId,
      doctorId,
      therapyName: therapyName.trim(),
      time,
      duration: numericDuration,
      room: room.trim(),
      status: "Scheduled",
    });

    const populatedTherapy = await therapy.populate([
      { path: "patientId", select: "name email role assignedDoctor" },
      { path: "doctorId", select: "name email role" },
    ]);

    res.status(201).json(populatedTherapy);
  } catch (error) {
    console.error("Schedule therapy error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
