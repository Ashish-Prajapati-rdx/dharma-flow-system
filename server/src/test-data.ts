import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User";
import Therapy from "./models/Therapy";
import dotenv from "dotenv";

dotenv.config();

async function createTestData() {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/dharma-flow";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Clear existing test data
    await User.deleteMany({});
    await Therapy.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create doctor
    const hashedDoctorPassword = await bcrypt.hash("doctor123", 10);
    const doctor = await User.create({
      name: "Dr. Rajesh Kumar",
      email: "doctor@test.com",
      password: hashedDoctorPassword,
      role: "doctor",
    });
    console.log("👨‍⚕️ Doctor created:", doctor._id, doctor.email);

    // Create patients
    const hashedPatientPassword = await bcrypt.hash("patient123", 10);
    const patient1 = await User.create({
      name: "Amit Sharma",
      email: "amit@test.com",
      password: hashedPatientPassword,
      role: "patient",
      assignedDoctor: doctor._id,
    });
    console.log("👤 Patient 1 created:", patient1._id, patient1.email);

    const patient2 = await User.create({
      name: "Priya Patel",
      email: "priya@test.com",
      password: hashedPatientPassword,
      role: "patient",
      assignedDoctor: doctor._id,
    });
    console.log("👤 Patient 2 created:", patient2._id, patient2.email);

    // Create sample appointments
    const today = new Date();
    const appointment1 = await Therapy.create({
      patientId: patient1._id,
      doctorId: doctor._id,
      therapyName: "Abhyanga (Oil Massage)",
      time: "10:00",
      duration: 60,
      room: "Room A",
      status: "Scheduled",
    });
    console.log("📅 Appointment 1 created:", appointment1._id);

    const appointment2 = await Therapy.create({
      patientId: patient2._id,
      doctorId: doctor._id,
      therapyName: "Swedana (Sweating Therapy)",
      time: "11:15",
      duration: 45,
      room: "Room B",
      status: "Scheduled",
    });
    console.log("📅 Appointment 2 created:", appointment2._id);

    const appointment3 = await Therapy.create({
      patientId: patient1._id,
      doctorId: doctor._id,
      therapyName: "Nasya (Nasal Oil Therapy)",
      time: "14:00",
      duration: 30,
      room: "Room A",
      status: "Scheduled",
    });
    console.log("📅 Appointment 3 created:", appointment3._id);

    console.log("\n✨ Test data created successfully!");
    console.log("\n🔐 Login credentials:");
    console.log("Doctor Email: doctor@test.com");
    console.log("Doctor Password: doctor123");
    console.log("Patient Email: amit@test.com");
    console.log("Patient Password: patient123");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTestData();
