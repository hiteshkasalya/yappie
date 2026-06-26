import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Confession from "@/models/Confession";

const createConfessionSchema = z.object({
  message: z.string().min(5, "Confession must be at least 5 characters").max(1000, "Confession cannot exceed 1000 characters"),
  scope: z.enum(["campus", "global"])
});

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "global"; // "campus" or "global"

  let query: any = {};
  if (type === "campus") {
    if (!user.college || user.college === "Other") {
      return Response.json({ error: "Campus feed is not available for your stream." }, { status: 400 });
    }
    query.college = user.college;
  } else {
    query.college = "Other";
  }

  try {
    const confessions = await Confession.find(query).sort({ timestamp: -1 });
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

  const { message, scope } = payload.data;

  await connectToDatabase();

  const college = scope === "campus" ? (user.college || "Other") : "Other";

  try {
    const newConfession = await Confession.create({
      senderId: user._id,
      anonymousUsername: user.anonymousUsername,
      college,
      message,
      comments: []
    });

    return Response.json({ confession: newConfession });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to create confession." }, { status: 500 });
  }
}
