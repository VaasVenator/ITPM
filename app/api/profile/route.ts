import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, authCookieName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
const IT_REGEX = /^IT\d{8}$/;
const UNI_EMAIL_REGEX = /^IT\d{8}@my\.sliit\.lk$/i;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      username: true,
      itNumber: true,
      email: true,
      profileImage: true,
      organiserBadge: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const itNumber = String(body.itNumber ?? "").toUpperCase().trim();
    const email = String(body.email ?? "").toLowerCase().trim();
    const profileImageRaw = body.profileImage;
    const profileImage =
      typeof profileImageRaw === "string" && profileImageRaw.trim().length > 0
        ? profileImageRaw.trim()
        : null;

    if (name.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json({ error: "Username must be 3-24 chars and only letters, numbers, underscores." }, { status: 400 });
    }

    if (!IT_REGEX.test(itNumber)) {
      return NextResponse.json({ error: "IT number must be in format IT12345678." }, { status: 400 });
    }

    if (!UNI_EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Email must be in format IT12345678@my.sliit.lk." }, { status: 400 });
    }

    if (email.split("@")[0].toUpperCase() !== itNumber) {
      return NextResponse.json({ error: "Email username must match IT number." }, { status: 400 });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        id: { not: sessionUser.id },
        OR: [{ email }, { username }, { itNumber }]
      },
      select: { id: true }
    });

    if (duplicate) {
      return NextResponse.json({ error: "Email, username, or IT number is already used." }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name,
        username,
        itNumber,
        email,
        profileImage
      },
      select: {
        id: true,
        name: true,
        username: true,
        itNumber: true,
        email: true,
        profileImage: true,
        organiserBadge: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.delete({ where: { id: sessionUser.id } });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(authCookieName(), "", { path: "/", expires: new Date(0) });
    return res;
  } catch (error) {
    console.error("Delete account failed:", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
