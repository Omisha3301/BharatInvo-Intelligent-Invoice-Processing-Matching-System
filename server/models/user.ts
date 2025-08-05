import mongoose, { Schema } from "mongoose";
import { User } from "@shared/schema";

const userSchema = new Schema<User>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "hod", "bookkeeper"], required: true },
  department: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.model<User>("User", userSchema);