import mongoose from "mongoose";

export type MessageDocument = mongoose.Document & {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  roomId: string;
  chatType: "random" | "campus" | "friend";
  message: string;
  isRead: boolean;
  timestamp: Date;
};

const MessageSchema = new mongoose.Schema<MessageDocument>({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  roomId: { type: String, required: true, index: true },
  chatType: { type: String, enum: ["random", "campus", "friend"], required: true },
  message: { type: String, required: true, maxlength: 700 },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true, expires: 86400 }
});

export default mongoose.models.Message || mongoose.model<MessageDocument>("Message", MessageSchema);
