import mongoose from "mongoose";
import type { Gender } from "../types";

export type UserDocument = mongoose.Document & {
  googleId?: string;
  supabaseId?: string;
  email: string;
  anonymousUsername: string;
  age?: number;
  gender?: Gender;
  college?: string;
  normalizedCollege?: string;
  blockedUsers: mongoose.Types.ObjectId[];
  isOnline: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new mongoose.Schema<UserDocument>(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    supabaseId: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    anonymousUsername: { type: String, required: true, unique: true, index: true },
    age: { type: Number, min: 17, max: 80 },
    gender: {
      type: String,
      enum: ["woman", "man", "non_binary", "prefer_not_to_say", "self_describe"]
    },
    college: { type: String, trim: true, maxlength: 120 },
    normalizedCollege: { type: String, index: true },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isOnline: { type: Boolean, default: false, index: true },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
