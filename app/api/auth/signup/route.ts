import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { authCookieName, getSafeSessionProfileImage, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const [emailExisting, usernameExisting, itNumberExisting] = await Promise.all([
      prisma.user.findUnique({ where: { email: parsed.data.email } }),
      prisma.user.findUnique({ where: { username: parsed.data.username } }),
      prisma.user.findUnique({ where: { itNumber: parsed.data.itNumber } })
    ]);

    if (emailExisting || usernameExisting || itNumberExisting) {
      return NextResponse.json(
        {
          error: emailExisting
            ? "Email already in use"
            : usernameExisting
            ? "Username already in use"
            : "IT number already registered"
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.username,
        username: parsed.data.username,
        itNumber: parsed.data.itNumber,
        email: parsed.data.email,
        profileImage: parsed.data.profileImage?.trim() || null,
        password: hashedPassword
      }
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: getSafeSessionProfileImage(user.profileImage)
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(authCookieName(), token, { httpOnly: true, sameSite: "lax", path: "/" });
    return res;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Could not connect to database. Check DATABASE_URL and database availability." },
      { status: 503 }
    );
  }
}
