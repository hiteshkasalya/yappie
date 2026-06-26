import mongoose from "mongoose";

export type ConfessionComment = {
  id: string;
  senderId: mongoose.Types.ObjectId;
  anonymousUsername: string;
  message: string;
  timestamp: Date;
};

export type ConfessionDocument = mongoose.Document & {
  senderId: mongoose.Types.ObjectId;
  anonymousUsername: string;
  college: string;
  message: string;
  comments: ConfessionComment[];
  timestamp: Date;
};

const ConfessionSchema = new mongoose.Schema<ConfessionDocument>({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  anonymousUsername: { type: String, required: true },
  college: { type: String, required: true, index: true },
  message: { type: String, required: true, maxlength: 1000 },
  comments: [
    {
      id: { type: String, required: true },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      anonymousUsername: { type: String, required: true },
      message: { type: String, required: true, maxlength: 700 },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  timestamp: { type: Date, default: Date.now, index: true, expires: 604800 } // TTL 7 days (604800 seconds)
});

ConfessionSchema.index({ college: 1, timestamp: -1 });

export default mongoose.models.Confession || mongoose.model<ConfessionDocument>("Confession", ConfessionSchema);
