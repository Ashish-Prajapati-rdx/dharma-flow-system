import express from "express";
import authRoutes from "./routes/auth.js";
import therapyRoutes from "./routes/therapy.js";
import appointmentsRoutes from "./routes/appointments.js";
import userRoutes from "./routes/users.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import cors from "cors";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/therapy", therapyRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api", userRoutes);
app.use("/api/users", userRoutes);
app.use(chatbotRoutes);

app.get("/", (_req, res) => {
  res.send("API is running");
});

// Error handler (optional, for robustness)
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

export default app;
