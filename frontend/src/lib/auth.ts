import { NextRequest } from "next/server";
import { connectToDatabase } from "./mongodb";
import { hashSessionToken } from "./anonymous";
import User from "../models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_jwt_key_for_yappie";

export async function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const token = request.headers.get("x-session-token");

  if (!token) {
    return null;
  }

  await connectToDatabase();

  if (token.split('.').length === 3) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { internalId: string };
      return User.findById(decoded.internalId);
    } catch (e) {
      return null;
    }
  }

  if (userId) {
    return User.findOne({
      _id: userId,
      sessionTokenHash: hashSessionToken(token)
    });
  }

  return null;
}

export function unauthorized() {
  return Response.json({ error: "Anonymous session is required" }, { status: 401 });
}
