import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { normalizeCollege } from "@/lib/anonymous";
import { toPublicUser } from "@/lib/publicUser";

const onboardSchema = z.object({
  age: z.coerce.number().int().min(17, "Minimum age is 17").max(80, "Maximum age is 80"),
  college: z.enum(["MIT WPU", "Other"], {
    errorMap: () => ({ message: "College must be either 'MIT WPU' or 'Other'." })
  })
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return unauthorized();
    }

    const body = await request.json().catch(() => null);
    const payload = onboardSchema.safeParse(body);

    if (!payload.success) {
      const errorMsg = payload.error.issues[0]?.message || "Invalid onboarding details.";
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const { age, college } = payload.data;

    user.age = age;
    user.college = college;
    user.normalizedCollege = normalizeCollege(college);

    await user.save();

    return Response.json({ user: toPublicUser(user) }, { status: 200 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return Response.json({ error: "Failed to update onboarding info. Please try again." }, { status: 500 });
  }
}
