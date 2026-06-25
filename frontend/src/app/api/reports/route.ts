import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Report from "@/models/Report";

const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(800).optional()
});

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  const payload = reportSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success || payload.data.reportedUserId === String(user._id)) {
    return Response.json({ error: "Valid report details are required" }, { status: 400 });
  }

  await connectToDatabase();

  await Report.create({
    reporterId: user._id,
    reportedUserId: payload.data.reportedUserId,
    reason: payload.data.reason,
    details: payload.data.details
  });

  return Response.json({ ok: true }, { status: 201 });
}
