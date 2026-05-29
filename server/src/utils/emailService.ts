import nodemailer from "nodemailer";
import { getTreatmentInstructions } from "./treatmentInstructions.js";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const getEmailCredentials = ():
  | { user: string; pass: string }
  | null => {
  const user = process.env.EMAIL_USER?.trim();
  const pass =
    process.env.EMAIL_PASS?.trim() ?? process.env.EMAIL_PASSWORD?.trim();

  if (!user || !pass) return null;
  return { user, pass };
};

const getTransporter = () => {
  const credentials = getEmailCredentials();
  if (!credentials) return null;

  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: credentials,
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  try {
    const credentials = getEmailCredentials();
    const mailTransporter = getTransporter();

    if (!credentials || !mailTransporter) {
      console.warn(
        "Email skipped: EMAIL_USER and EMAIL_PASS must be configured.",
      );
      return false;
    }

    const mailOptions = {
      from: `"AyurSutra Support" <${credentials.user}>`,
      to,
      subject,
      html,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    console.log("📨 Email sent successfully: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Nodemailer Error:", error);
    return false;
  }
};

export interface AppointmentNotificationPayload {
  patientEmail?: string;
  patientName: string;
  doctorName: string;
  therapyName: string;
  appointmentDate: string;
  timeSlot: string;
  currentDayNumber: number;
}

export type AppointmentNotificationKind = "scheduled" | "completed";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderInstructionList = (items: string[]): string =>
  items
    .map(
      (item) =>
        `<li style="margin: 0 0 8px 0; color: #334155; line-height: 1.5;">${escapeHtml(item)}</li>`,
    )
    .join("");

const appointmentEmailTemplate = (
  payload: AppointmentNotificationPayload,
  kind: AppointmentNotificationKind,
): string => {
  const instructions = getTreatmentInstructions(payload.therapyName);
  const title =
    kind === "scheduled"
      ? "Your Panchakarma session is scheduled"
      : "Your Panchakarma session is complete";
  const subtitle =
    kind === "scheduled"
      ? "Please review the timing and precautions for your therapy day."
      : "Your doctor has marked today’s therapy as complete. Please follow the recovery instructions.";

  return `
    <div style="margin:0; padding:0; background:#f8fafc; font-family:Arial, sans-serif;">
      <div style="max-width:640px; margin:auto; padding:28px 18px;">
        <div style="border-radius:18px; overflow:hidden; border:1px solid #dbe7df; background:#ffffff; box-shadow:0 14px 36px rgba(15, 23, 42, 0.08);">
          <div style="background:#0f766e; color:#ffffff; padding:26px 30px;">
            <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:2px; text-transform:uppercase; opacity:.78;">AyurSutra Treatment OS</p>
            <h1 style="margin:0; font-size:26px; line-height:1.2;">${title}</h1>
            <p style="margin:10px 0 0 0; color:#d1fae5; font-size:14px; line-height:1.5;">${subtitle}</p>
          </div>

          <div style="padding:28px 30px;">
            <p style="margin:0 0 18px 0; color:#334155; font-size:15px; line-height:1.6;">Namaste <strong>${escapeHtml(payload.patientName)}</strong>,</p>

            <table role="presentation" style="width:100%; border-collapse:collapse; margin:0 0 24px 0;">
              <tr>
                <td style="padding:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Therapy</td>
                <td style="padding:12px; border:1px solid #e2e8f0; color:#0f172a; font-weight:700;">${escapeHtml(payload.therapyName)}</td>
              </tr>
              <tr>
                <td style="padding:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Day</td>
                <td style="padding:12px; border:1px solid #e2e8f0; color:#0f172a;">Day ${payload.currentDayNumber} of 21</td>
              </tr>
              <tr>
                <td style="padding:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Date & Time</td>
                <td style="padding:12px; border:1px solid #e2e8f0; color:#0f172a;">${escapeHtml(payload.appointmentDate)} at ${escapeHtml(payload.timeSlot)}</td>
              </tr>
              <tr>
                <td style="padding:12px; border:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Doctor</td>
                <td style="padding:12px; border:1px solid #e2e8f0; color:#0f172a;">${escapeHtml(payload.doctorName)}</td>
              </tr>
            </table>

            <div style="border-radius:14px; background:#ecfdf5; border:1px solid #bbf7d0; padding:18px 20px; margin-bottom:18px;">
              <h2 style="margin:0 0 10px 0; color:#065f46; font-size:16px;">Before the session</h2>
              <ul style="padding-left:20px; margin:0;">${renderInstructionList(instructions.pre)}</ul>
            </div>

            <div style="border-radius:14px; background:#fff7ed; border:1px solid #fed7aa; padding:18px 20px;">
              <h2 style="margin:0 0 10px 0; color:#9a3412; font-size:16px;">After the session</h2>
              <ul style="padding-left:20px; margin:0;">${renderInstructionList(instructions.post)}</ul>
            </div>

            <p style="margin:24px 0 0 0; color:#64748b; font-size:12px; line-height:1.5;">This is an automated care notification from AyurSutra. Follow your doctor's personalized instructions if they differ from this summary.</p>
          </div>
        </div>
      </div>
    </div>
  `;
};

export const queueAppointmentNotificationEmail = (
  payload: AppointmentNotificationPayload,
  kind: AppointmentNotificationKind,
): void => {
  if (!payload.patientEmail) {
    console.warn("Appointment email skipped: patient email missing.");
    return;
  }

  setImmediate(() => {
    const subject =
      kind === "scheduled"
        ? `AyurSutra: ${payload.therapyName} scheduled for ${payload.appointmentDate}`
        : `AyurSutra: ${payload.therapyName} marked complete`;

    sendEmail({
      to: payload.patientEmail as string,
      subject,
      html: appointmentEmailTemplate(payload, kind),
    }).catch((error) => {
      console.error("Appointment email dispatch failed:", error);
    });
  });
};
