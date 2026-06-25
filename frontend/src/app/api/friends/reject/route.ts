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

  const deleted = await Friendship.deleteOne({
    _id: payload.data.friendshipId,
    $or: [{ userId: user._id }, { friendId: user._id }],
  });

  if (deleted.deletedCount === 0) {
    return Response.json({ error: "Friendship not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
