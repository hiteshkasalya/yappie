import { NextRequest } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Confession from "@/models/Confession";

const createCommentSchema = z.object({
  message: z.string().min(1, "Comment cannot be empty").max(700, "Comment cannot exceed 700 characters")
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ confessionId: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  const { confessionId } = await params;
  if (!mongoose.Types.ObjectId.isValid(confessionId)) {
    return Response.json({ error: "Invalid confession ID" }, { status: 400 });
  }

  const payload = createCommentSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    const errorMsg = payload.error.issues[0]?.message || "Invalid input data.";
    return Response.json({ error: errorMsg }, { status: 400 });
  }

  const { message } = payload.data;

  await connectToDatabase();

  try {
    const confession = await Confession.findById(confessionId);
    if (!confession) {
      return Response.json({ error: "Confession not found" }, { status: 404 });
    }

    const commentId = new mongoose.Types.ObjectId().toString();
    const comment = {
      id: commentId,
      senderId: user._id,
      anonymousUsername: user.anonymousUsername,
      message,
      timestamp: new Date()
    };

    confession.comments.push(comment);
    await confession.save();

    return Response.json({ comment });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to add comment." }, { status: 500 });
  }
}
