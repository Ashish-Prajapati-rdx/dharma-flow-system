import Therapy, { type ITherapy } from "../models/Therapy";
import User from "../models/User";
import { formatSystemDate } from "../utils/appointmentTime";
import { queueAppointmentNotificationEmail } from "../utils/emailService";

let schedulerHandle: NodeJS.Timeout | null = null;

const currentSystemMinutes = (date = new Date()): number =>
  date.getHours() * 60 + date.getMinutes();

const clampCycleDay = (value: number): number =>
  Math.min(Math.max(Math.trunc(value), 1), 21);

const advancePatientCycle = async (appointment: ITherapy): Promise<void> => {
  await User.updateOne(
    { _id: appointment.patientId, role: "patient" },
    {
      $max: {
        "treatmentProfile.currentDayNumber": clampCycleDay(
          appointment.currentDayNumber + 1,
        ),
      },
      $set: {
        "treatmentProfile.cycleLength": 21,
        "treatmentProfile.lastCompletedAppointment": appointment._id,
        "treatmentProfile.lastProgressAt": new Date(),
      },
    },
  );
};

const queueCompletedEmail = async (appointment: ITherapy): Promise<void> => {
  const [patient, doctor] = await Promise.all([
    User.findById(appointment.patientId).select("name email").lean(),
    User.findById(appointment.doctorId).select("name").lean(),
  ]);

  if (!patient || !doctor) return;

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
    "completed",
  );
};

export const runAppointmentSchedulerTick = async (
  now = new Date(),
): Promise<void> => {
  const today = formatSystemDate(now);
  const nowMinutes = currentSystemMinutes(now);

  await Therapy.updateMany(
    {
      appointmentDate: { $lt: today },
      treatmentStatus: "scheduled",
    },
    {
      $set: {
        treatmentStatus: "missed",
        status: "Scheduled",
        missedAt: now,
      },
    },
  );

  const overdueOngoingAppointments = await Therapy.find({
    treatmentStatus: "ongoing",
    $or: [
      { appointmentDate: { $lt: today } },
      { appointmentDate: today, endMinutes: { $lte: nowMinutes } },
    ],
  });

  for (const appointment of overdueOngoingAppointments) {
    const completedAppointment = await Therapy.findOneAndUpdate(
      { _id: appointment._id, treatmentStatus: "ongoing" },
      {
        $set: {
          treatmentStatus: "completed",
          status: "Completed",
          completedAt: now,
        },
      },
      { new: true },
    );

    if (!completedAppointment) continue;

    await advancePatientCycle(completedAppointment);
    await queueCompletedEmail(completedAppointment);
  }
};

export const startAppointmentScheduler = (): void => {
  if (schedulerHandle) return;

  const tick = () => {
    runAppointmentSchedulerTick().catch((error) => {
      console.error("Appointment scheduler tick failed:", error);
    });
  };

  schedulerHandle = setInterval(tick, 60 * 1000);
  schedulerHandle.unref?.();
  setTimeout(tick, 5 * 1000).unref?.();
  console.log("Appointment scheduler started");
};

