import { Router } from "express";
import {
  createAppointment,
  deleteAppointment,
  getDoctorAppointments,
  getDoctorTodayAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  upsertAppointmentProgress,
} from "../controllers/appointmentController";

const router = Router();

router.post("/new", createAppointment);
router.get("/doctor/:doctorId/today", getDoctorTodayAppointments);
router.get("/doctor/:doctorId", getDoctorAppointments);
router.get("/patient/:patientId", getPatientAppointments);
router.patch("/:appointmentId/status", updateAppointmentStatus);
router.post("/:appointmentId/progress", upsertAppointmentProgress);
router.delete("/:appointmentId", deleteAppointment);

export default router;
