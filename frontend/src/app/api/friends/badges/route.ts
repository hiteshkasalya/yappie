import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Friendship from "@/models/Friendship";
import Message from "@/models/Message";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  await connectToDatabase();

  const [pendingRequests, unreadMessages] = await Promise.all([
    Friendship.countDocuments({ friendId: user._id, status: "pending" }),
    Message.countDocuments({ receiverId: user._id, chatType: "friend", isRead: false })
  ]);

  return Response.json({
    pendingRequests,
    unreadMessages
  });
}
