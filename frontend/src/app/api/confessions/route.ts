import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Confession from "@/models/Confession";

const createConfessionSchema = z.object({
  message: z.string().min(5, "Confession must be at least 5 characters").max(1000, "Confession cannot exceed 1000 characters")
});

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  await connectToDatabase();

  const college = user.college || "Other";

  try {
    // Explicitly exclude senderId and comments.senderId from the fetched documents to guarantee anonymity
    const confessions = await Confession.find({ college }, { senderId: 0, "comments.senderId": 0 })
      .sort({ timestamp: -1 })
      .limit(50);
    return Response.json({ confessions });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load confessions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  const payload = createConfessionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    const errorMsg = payload.error.issues[0]?.message || "Invalid input data.";
    return Response.json({ error: errorMsg }, { status: 400 });
  }

  const { message } = payload.data;

  await connectToDatabase();

  const college = user.college || "Other";

  try {
    const newConfession = await Confession.create({
      senderId: user._id,
      anonymousUsername: user.anonymousUsername,
      college,
      message,
      comments: []
    });

    // Manually strip senderId from the returned payload
    const returnedConfession = {
      _id: newConfession._id,
      anonymousUsername: newConfession.anonymousUsername,
      college: newConfession.college,
      message: newConfession.message,
      comments: newConfession.comments,
      timestamp: newConfession.timestamp
    };

    return Response.json({ confession: returnedConfession });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to create confession." }, { status: 500 });
  }
}
