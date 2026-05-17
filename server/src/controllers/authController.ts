import { sendEmail } from "../utils/emailService";
import type { RequestHandler } from "express";
import User, { type UserRole } from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const isUserRole = (role: unknown): role is UserRole =>
  role === "doctor" || role === "patient";

export const register: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !isUserRole(role)) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: "User already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });

    // 1. Sabse pehle database mein data save karo securely
    await user.save();

    // 2. Response frontend ko TURANT bhej do taaki screen freeze na ho
    res.status(201).json({ message: "User registered successfully." });

    // 3. Email ko background mein aaram se bhejte raho (Non-blocking execution)
    setImmediate(() => {
      sendEmail({
        to: user.email,
        subject: "Welcome to AyurSutra — Your Panchakarma OS Account is Ready!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fafaf9;">
            <h2 style="color: #059669; font-size: 24px; font-weight: bold; border-bottom: 2px solid #10b981; padding-bottom: 10px;">🍃 Welcome to AyurSutra</h2>
            <p style="font-size: 16px; color: #4b5563; line-height: 1.5;">Namaste <strong>${user.name}</strong>,</p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Your account has been successfully created on AyurSutra as a <strong>${user.role}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">Automated notification from AyurSutra Suite for SIH.</p>
          </div>
        `,
      }).catch((err) =>
        console.error(" Background email dispatch failed:", err),
      );
    });
  } catch (error) {
    console.error("Registration error:", error);
    // Double headers block check safe guard
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error." });
    }
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not defined.");
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
