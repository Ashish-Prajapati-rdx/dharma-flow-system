import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/db";
import { startAppointmentScheduler } from "./jobs/appointmentScheduler";

const PORT = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    startAppointmentScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
