import nodemailer from "nodemailer";

// 1. Transporter configuration using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// 2. Reusable Send Email Function
export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  try {
    const mailOptions = {
      from: `"AyurSutra Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Email sent successfully: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Nodemailer Error:", error);
    return false;
  }
};