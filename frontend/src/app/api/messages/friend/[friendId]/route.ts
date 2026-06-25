import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { createPairKey } from "@/lib/pairKey";
import Friendship from "@/models/Friendship";
import Message from "@/models/Message";

export async function GET(request: NextRequest, { params }: { params: Promise<{ friendId: string }> }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const { friendId } = await params;
  const pairKey = createPairKey(String(user._id), friendId);
  const friendship = await Friendship.findOne({ pairKey, status: "accepted" });

  if (!friendship) {
    return Response.json({ error: "Friend chat is not available" }, { status: 403 });
  }

  await Message.updateMany(
    { roomId: `friend:${pairKey}`, receiverId: user._id, isRead: false },
    { isRead: true }
  );

  const messages = await Message.find({ roomId: `friend:${pairKey}` }).sort({ timestamp: 1 }).limit(100);

  return Response.json({
    messages: messages.map((message) => ({
      id: String(message._id),
      roomId: message.roomId,
      senderId: String(message.senderId),
      receiverId: String(message.receiverId),
      message: message.message,
      timestamp: message.timestamp.toISOString()
    }))
  });
}
