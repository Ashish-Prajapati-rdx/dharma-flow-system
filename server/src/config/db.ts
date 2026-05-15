import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI environment variable is not defined. Please check your .env file.",
    );
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

export default connectDB;
