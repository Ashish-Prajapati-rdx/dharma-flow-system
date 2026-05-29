import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app.js";
import connectDB from "./config/db.js";
import { startAppointmentScheduler } from "./jobs/appointmentScheduler.js";

const PORT = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    startAppointmentScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
