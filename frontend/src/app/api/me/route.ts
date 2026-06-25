import { NextRequest } from "next/server";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { toPublicUser } from "@/lib/publicUser";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return unauthorized();
  }

  return Response.json({ user: toPublicUser(user) });
}
