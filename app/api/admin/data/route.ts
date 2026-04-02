import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [
      events,
      tickets,
      publishedEvents,
      cancelledEvents,
      deletedEvents,
      reviewedEvents,
      reviewedTickets,
    ] = await Promise.all([
      prisma.event.findMany({
        where: { deleted: false, reviewStatus: "PENDING" },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticket.findMany({
        where: { reviewStatus: "PENDING" },
        include: { event: true, user: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        where: { approved: true, published: true, deleted: false },
        include: { createdBy: true },
        orderBy: { date: "asc" },
      }),
      prisma.event.findMany({
        where: { cancelled: true, deleted: false },
        include: { createdBy: true },
        orderBy: { date: "desc" },
      }),
      prisma.event.findMany({
        where: { deleted: true },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.event.findMany({
        where: { reviewStatus: { not: "PENDING" } },
        include: { createdBy: true },
        orderBy: { reviewedAt: "desc" },
      }),
      prisma.ticket.findMany({
        where: { reviewStatus: { not: "PENDING" } },
        include: { event: true, user: true },
        orderBy: { reviewedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      events,
      tickets,
      publishedEvents,
      cancelledEvents,
      deletedEvents,
      reviewedEvents,
      reviewedTickets,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}
