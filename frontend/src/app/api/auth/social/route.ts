import { NextRequest } from "next/server";
import { z } from "zod";
import { createSessionToken, hashSessionToken, generateAnonymousUsername } from "@/lib/anonymous";
import { connectToDatabase } from "@/lib/mongodb";
import { toPublicUser } from "@/lib/publicUser";
import User from "@/models/User";

const socialAuthSchema = z.object({
  provider: z.enum(["google", "apple"]),
  socialId: z.string().min(1),
  email: z.string().trim().email("Invalid email address"),
  name: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const payload = socialAuthSchema.safeParse(body);

    if (!payload.success) {
      return Response.json({ error: "Invalid social credentials." }, { status: 400 });
    }

    const { provider, socialId, email, name } = payload.data;

    await connectToDatabase();

    // Check if user already exists with this email
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create user: generate unique anonymous handle
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

      // Create a user without a password (represented as an empty string since they are OAuth users)
      user = await User.create({
        email: email.toLowerCase(),
        anonymousUsername,
        passwordHash: "", // Empty password for social login
        sessionTokenHash: "temp" // updated below
      });
    }

    const token = createSessionToken();
    user.sessionTokenHash = hashSessionToken(token);
    await user.save();

    return Response.json({ user: toPublicUser(user), token }, { status: 200 });
  } catch (error) {
    console.error("Social Auth error:", error);
    return Response.json({ error: "Failed to authenticate with social provider. Please try again." }, { status: 500 });
  }
}
