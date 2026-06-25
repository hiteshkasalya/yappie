import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createPairKey } from "@/lib/pairKey";
import Block from "@/models/Block";
import Friendship from "@/models/Friendship";

const blockSchema = z.object({
  blockedUserId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const payload = blockSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success || payload.data.blockedUserId === String(user._id)) {
    return Response.json({ error: "Valid user id is required" }, { status: 400 });
  }

  await connectToDatabase();

  await Block.updateOne(
    { pairKey: `${user._id}:${payload.data.blockedUserId}` },
    {
      $setOnInsert: {
        blockerId: user._id,
        blockedUserId: payload.data.blockedUserId,
        pairKey: `${user._id}:${payload.data.blockedUserId}`
      }
    },
    { upsert: true }
  );

  await Friendship.deleteOne({ pairKey: createPairKey(String(user._id), payload.data.blockedUserId) });

  return Response.json({ ok: true }, { status: 201 });
}
