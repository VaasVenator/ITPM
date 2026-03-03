import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown server error";
}

function isDatabaseConnectivityError(message: string): boolean {
  return (
    message.includes("Can't reach database server") ||
    message.includes("Authentication failed against database server") ||
    message.includes("getaddrinfo ENOTFOUND") ||
    message.includes("connection") ||
    message.includes("timed out")
  );
}

function eventApiError(error: unknown, fallback: string) {
  const message = asErrorMessage(error);

  if (isDatabaseConnectivityError(message)) {
    return NextResponse.json(
      {
        error: "Could not connect to database. Check DATABASE_URL and database availability.",
        debug: process.env.NODE_ENV === "production" ? undefined : message
      },
      { status: 503 }
    );
  }

  if (message.includes("does not exist in the current database")) {
    return NextResponse.json(
      {
        error: "Database schema is out of date. Run Prisma migration/db push.",
        debug: process.env.NODE_ENV === "production" ? undefined : message
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: fallback,
      debug: process.env.NODE_ENV === "production" ? undefined : message
    },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { approved: true, published: true, deleted: false },
      include: { createdBy: true }
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error("Fetch events failed:", error);
    return eventApiError(error, "Failed to fetch events.");
  }
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
        published: false,
        cancelled: false,
        deleted: false
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event failed:", error);
    return eventApiError(error, "Failed to create event. Please try again.");
  }
}
