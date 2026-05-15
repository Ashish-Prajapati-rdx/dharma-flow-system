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
    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error." });
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

    res.json({ token, role: user.role, name: user.name });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
