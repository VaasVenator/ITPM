import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { authCookieName, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      console.log("LOGIN PARSE ERROR:", parsed.error.flatten());
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 👇 ADD LOGS HERE (AFTER parsed is defined)

    const identifier = parsed.data.identifier.trim();
    console.log("LOGIN IDENTIFIER:", identifier);

    const user = identifier.includes("@")
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findUnique({ where: { username: identifier } });

    console.log("USER FOUND:", !!user);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.password);
    console.log("PASSWORD VALID:", valid);

    if (!valid) {
      return NextResponse.json({ error: "Password does not match" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(authCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    return res;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Could not connect to database." },
      { status: 503 }
    );
  }
}
