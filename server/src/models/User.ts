import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "doctor" | "patient";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedDoctor?: Types.ObjectId;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["doctor", "patient"], required: true },
    assignedDoctor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
