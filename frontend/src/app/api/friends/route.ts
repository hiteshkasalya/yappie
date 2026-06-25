import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createPairKey } from "@/lib/pairKey";
import { toPublicUser } from "@/lib/publicUser";
import Friendship from "@/models/Friendship";
import User from "@/models/User";

const createFriendSchema = z.object({
  friendId: z.string().min(1)
});

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  await connectToDatabase();

  const friendships = await Friendship.find({
    $or: [{ userId: user._id }, { friendId: user._id }],
    status: { $in: ["pending", "accepted"] }
  }).sort({ updatedAt: -1 });

  const userIds = friendships.map((friendship) =>
    String(friendship.userId) === String(user._id) ? friendship.friendId : friendship.userId
  );
  const users = await User.find({ _id: { $in: userIds } });
  const usersById = new Map(users.map((friend) => [String(friend._id), friend]));

  return Response.json({
    friends: friendships
      .map((friendship) => {
        const friendId = String(friendship.userId) === String(user._id) ? friendship.friendId : friendship.userId;
        const friend = usersById.get(String(friendId));

        if (!friend) {
          return null;
        }

        return {
          friendshipId: String(friendship._id),
          status: friendship.status,
          requestedByMe: String(friendship.requestedBy) === String(user._id),
          friend: toPublicUser(friend)
        };
      })
      .filter(Boolean)
  });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const payload = createFriendSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success || payload.data.friendId === String(user._id)) {
    return Response.json({ error: "Valid friend id is required" }, { status: 400 });
  }

  await connectToDatabase();

  const friend = await User.findById(payload.data.friendId);

  if (!friend) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const pairKey = createPairKey(String(user._id), String(friend._id));
  const friendship = await Friendship.findOneAndUpdate(
    { pairKey },
    {
      $setOnInsert: {
        userId: user._id,
        friendId: friend._id,
        requestedBy: user._id,
        pairKey,
        status: "pending"
      }
    },
    { new: true, upsert: true }
  );

  return Response.json({ friendshipId: String(friendship._id), status: friendship.status });
}
