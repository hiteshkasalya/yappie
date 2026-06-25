import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Friendship from "@/models/Friendship";

const schema = z.object({ friendshipId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return Response.json({ error: "friendshipId required" }, { status: 400 });
  }

  await connectToDatabase();

  const friendship = await Friendship.findOne({
    _id: payload.data.friendshipId,
    $or: [{ userId: user._id }, { friendId: user._id }],
  });

  if (!friendship) {
    return Response.json({ error: "Friendship not found" }, { status: 404 });
  }

  // Only the receiver (non-requester) can accept
  if (String(friendship.requestedBy) === String(user._id)) {
    return Response.json({ error: "Only the receiver can accept" }, { status: 403 });
  }

  friendship.status = "accepted";
  await friendship.save();

  return Response.json({ friendshipId: String(friendship._id), status: friendship.status });
}
