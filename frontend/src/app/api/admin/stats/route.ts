import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { runtimeStats } from "@/lib/runtimeStats";
import Report from "@/models/Report";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (adminKey && request.headers.get("x-admin-key") !== adminKey) {
    return Response.json({ error: "Admin key is required" }, { status: 401 });
  }

  await connectToDatabase();

  const [totalUsers, reports, onlineUsers] = await Promise.all([
    User.countDocuments(),
    Report.countDocuments(),
    User.countDocuments({ isOnline: true })
  ]);

  return Response.json({
    totalUsers,
    onlineUsers: Math.max(onlineUsers, runtimeStats.onlineUserIds.size),
    activeChats: runtimeStats.activeChats,
    reports
  });
}
