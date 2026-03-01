import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { approved: true, published: true },
    include: { createdBy: true }
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = eventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      createdById: user.id,
      approved: false,
      published: false
    }
  });

  return NextResponse.json(event, { status: 201 });
}
