import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createPairKey } from "@/lib/pairKey";
import { toPublicUser } from "@/lib/publicUser";
import Friendship from "@/models/Friendship";
import User from "@/models/User";
import Message from "@/models/Message";

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

  // Query all unread messages for the current user
  const unreadMessages = await Message.find({
    receiverId: user._id,
    chatType: "friend",
    isRead: false
  });

  const unreadCountBySender = new Map<string, number>();
  for (const msg of unreadMessages) {
    const senderStr = String(msg.senderId);
    unreadCountBySender.set(senderStr, (unreadCountBySender.get(senderStr) || 0) + 1);
  }

  return Response.json({
    friends: friendships
      .map((friendship) => {
        const friendId = String(friendship.userId) === String(user._id) ? friendship.friendId : friendship.userId;
        const friend = usersById.get(String(friendId));

        if (!friend) {
          return null;
        }

        const unreadCount = unreadCountBySender.get(String(friendId)) || 0;

        return {
          friendshipId: String(friendship._id),
          status: friendship.status,
          requestedByMe: String(friendship.requestedBy) === String(user._id),
          friend: toPublicUser(friend),
          unreadCount
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
