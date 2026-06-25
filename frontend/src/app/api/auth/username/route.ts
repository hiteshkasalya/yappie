import { NextRequest } from "next/server";
import { generateAnonymousUsername } from "@/lib/anonymous";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    let anonymousUsername = generateAnonymousUsername();
    let attempts = 0;

    while (await User.exists({ anonymousUsername })) {
      anonymousUsername = generateAnonymousUsername();
      attempts += 1;
      if (attempts > 8) {
        anonymousUsername = `${anonymousUsername}${Date.now().toString().slice(-4)}`;
        break;
      }
    }

    return Response.json({ username: anonymousUsername });
  } catch (error) {
    console.error("Failed to generate username:", error);
    return Response.json(
      { error: "Failed to generate username. Database connection error." },
      { status: 500 }
    );
  }
}
