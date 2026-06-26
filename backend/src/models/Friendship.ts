import mongoose from "mongoose";
import type { FriendStatus } from "../types";

export type FriendshipDocument = mongoose.Document & {
  userId: mongoose.Types.ObjectId;
  friendId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  pairKey: string;
  status: FriendStatus;
  createdAt: Date;
  updatedAt: Date;
};

const FriendshipSchema = new mongoose.Schema<FriendshipDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pairKey: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" }
  },
  { timestamps: true }
);

FriendshipSchema.index({ userId: 1, status: 1 });
FriendshipSchema.index({ friendId: 1, status: 1 });

export default mongoose.models.Friendship || mongoose.model<FriendshipDocument>("Friendship", FriendshipSchema);
