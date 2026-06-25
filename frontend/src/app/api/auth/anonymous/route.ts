import { NextRequest } from "next/server";
import { z } from "zod";
import { createSessionToken, generateAnonymousUsername, hashSessionToken, normalizeCollege } from "@/lib/anonymous";
import { connectToDatabase } from "@/lib/mongodb";
import { toPublicUser } from "@/lib/publicUser";
import User from "@/models/User";
import jwt from "jsonwebtoken";

const createAnonymousUserSchema = z.object({
  age: z.coerce.number().int().min(17).max(80),
  gender: z.enum(["woman", "man", "non_binary", "prefer_not_to_say", "self_describe"]),
  college: z.string().trim().min(2).max(120)
});

export async function POST(request: NextRequest) {
  const payload = createAnonymousUserSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return Response.json({ error: "Age, gender, and college are required" }, { status: 400 });
  }

  await connectToDatabase();

  const token = createSessionToken();
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

  const user = await User.create({
    anonymousUsername,
    age: payload.data.age,
    gender: payload.data.gender,
    college: payload.data.college.trim().replace(/\s+/g, " "),
    normalizedCollege: normalizeCollege(payload.data.college)
  });

  const JWT_SECRET = "super_secret_jwt_key_for_yappie";
  const jwtToken = jwt.sign({ internalId: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });

  return Response.json({ user: toPublicUser(user), token: jwtToken }, { status: 201 });
}
