import mongoose from "mongoose";

export type ReportDocument = mongoose.Document & {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  createdAt: Date;
};

const ReportSchema = new mongoose.Schema<ReportDocument>(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, required: true, maxlength: 120 },
    details: { type: String, maxlength: 800 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Report || mongoose.model<ReportDocument>("Report", ReportSchema);
