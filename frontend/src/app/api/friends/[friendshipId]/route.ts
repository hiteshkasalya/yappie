import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import Friendship from "@/models/Friendship";

const updateFriendshipSchema = z.object({
  action: z.enum(["accept", "reject"])
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const { friendshipId } = await params;
  const payload = updateFriendshipSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return Response.json({ error: "Valid action is required" }, { status: 400 });
  }

  const friendship = await Friendship.findOne({
    _id: friendshipId,
    $or: [{ userId: user._id }, { friendId: user._id }]
  });

  if (!friendship) {
    return Response.json({ error: "Friendship not found" }, { status: 404 });
  }

  if (String(friendship.requestedBy) === String(user._id) && payload.data.action === "accept") {
    return Response.json({ error: "Only the receiver can accept this request" }, { status: 403 });
  }

  if (payload.data.action === "reject") {
    await friendship.deleteOne();
    return Response.json({ ok: true });
  }

  friendship.status = "accepted";
  await friendship.save();

  return Response.json({ friendshipId: String(friendship._id), status: friendship.status });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const { friendshipId } = await params;
  await Friendship.deleteOne({
    _id: friendshipId,
    $or: [{ userId: user._id }, { friendId: user._id }]
  });

  return Response.json({ ok: true });
}
