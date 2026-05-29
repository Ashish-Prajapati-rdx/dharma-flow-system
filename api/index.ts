import type { VercelRequest, VercelResponse } from "@vercel/node";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection flag
let dbConnected = false;

// Connect to MongoDB
const connectDB = async () => {
  if (dbConnected) return;

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(mongoUri);
    dbConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Import routes from server
import authRoutes from "../server/src/routes/auth";
import appointmentRoutes from "../server/src/routes/appointments";
import userRoutes from "../server/src/routes/users";
import therapyRoutes from "../server/src/routes/therapy";
import chatbotRoutes from "../server/src/routes/chatbotRoutes";

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/therapy", therapyRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbConnected });
});

// Error handling middleware
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  },
);

// Main handler
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    await connectDB();
    app(req as any, res as any);
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
