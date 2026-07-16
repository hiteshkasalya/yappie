import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const uri = process.env.MONGODB_URI || "";
  const sanitized = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  return Response.json({
    hasUri: !!uri,
    sanitizedUri: sanitized
  });
}
