import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = Router();

const isValidObjectId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

router.get("/doctors", async (_req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("_id name email role emailVerified")
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    console.error("Fetch doctors error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const filter: Record<string, unknown> = { role: "patient" };
    if (isValidObjectId(req.query.doctorId)) {
      filter.assignedDoctor = req.query.doctorId;
    }

    const patients = await User.find(filter)
      .select(
        "_id name email role assignedDoctor emailVerified healthMetrics treatmentProfile",
      )
      .sort({ name: 1 });

    res.json(patients);
  } catch (error) {
    console.error("Fetch patients error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/patient/assign-doctor", async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;
    if (!isValidObjectId(patientId) || !isValidObjectId(doctorId)) {
      res
        .status(400)
        .json({ message: "Valid patientId and doctorId are required." });
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

    patient.assignedDoctor = doctor._id as mongoose.Types.ObjectId;
    await patient.save();

    res.json({
      message: "Doctor assigned successfully.",
      patient: {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        assignedDoctor: patient.assignedDoctor,
        emailVerified: patient.emailVerified,
        healthMetrics: patient.healthMetrics,
        treatmentProfile: patient.treatmentProfile,
      },
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
      },
    });
  } catch (error) {
    console.error("Assign doctor error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
