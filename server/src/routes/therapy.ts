import { Router, type RequestHandler } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createAppointment } from "../controllers/appointmentController.js";
import Therapy from "../models/Therapy.js";

interface AuthTokenPayload {
  userId: string;
  role: string;
}

const router = Router();

const isValidObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

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
      .populate(
        "patientId",
        "name email role assignedDoctor emailVerified healthMetrics treatmentProfile",
      )
      .populate("doctorId", "name email role")
      .sort({ appointmentDate: 1, startMinutes: 1 })
      .lean();

    res.json(therapies);
  } catch (error) {
    console.error("Fetch therapies error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/schedule", createAppointment);

export default router;
