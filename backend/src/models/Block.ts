import mongoose from "mongoose";

export type BlockDocument = mongoose.Document & {
  blockerId: mongoose.Types.ObjectId;
  blockedUserId: mongoose.Types.ObjectId;
  pairKey: string;
  createdAt: Date;
};

const BlockSchema = new mongoose.Schema<BlockDocument>(
  {
    blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pairKey: { type: String, required: true, unique: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Block || mongoose.model<BlockDocument>("Block", BlockSchema);
