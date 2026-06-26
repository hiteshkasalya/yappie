import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Confession from "@/models/Confession";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ confessionId: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return unauthorized();
  }

  const { confessionId } = await params;

  await connectToDatabase();

  try {
    const confession = await Confession.findById(
      confessionId,
      { senderId: 0, "comments.senderId": 0 }
    );
    if (!confession) {
      return Response.json({ error: "Confession not found." }, { status: 404 });
    }
    return Response.json({ confession });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load confession." }, { status: 500 });
  }
}
