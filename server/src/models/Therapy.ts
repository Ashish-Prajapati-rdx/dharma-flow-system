import mongoose, { Document, Schema, Types } from "mongoose";

export type TherapyStatus = "Scheduled" | "Completed";

export interface ITherapy extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  therapyName: string;
  time: string;
  duration: number;
  room: string;
  status: TherapyStatus;
}

const TherapySchema: Schema = new Schema<ITherapy>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    therapyName: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    room: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Scheduled", "Completed"],
      default: "Scheduled",
    },
  },
  { timestamps: true },
);

TherapySchema.index({ doctorId: 1, time: 1 });
TherapySchema.index({ room: 1, status: 1 });

export default mongoose.model<ITherapy>("Therapy", TherapySchema);
