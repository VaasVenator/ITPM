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
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(parsed.data.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid event date." }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        date: parsedDate,
        createdById: user.id,
        approved: false,
        published: false
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event failed:", error);
    return NextResponse.json({ error: "Failed to create event. Please try again." }, { status: 500 });
  }
}
