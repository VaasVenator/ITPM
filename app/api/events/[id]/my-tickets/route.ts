import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

function parseNotes(notes: string | null) {
  const parts = String(notes || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const map: Record<string, string> = {};

  for (const part of parts) {
    const [key, ...rest] = part.split(":");
    if (!key || rest.length === 0) continue;
    map[key.trim()] = rest.join(":").trim();
  }

  return map;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        eventId: params.id,
        userId: user.id,
        reviewStatus: "APPROVED",
      },
      include: {
        refundRequests: {
          where: {
            status: {
              in: ["PENDING", "APPROVED"],
            },
          },
          select: {
            id: true,
            status: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const availableTickets = tickets
      .filter((ticket) => ticket.refundRequests.length === 0)
      .map((ticket, index) => {
        const noteMap = parseNotes(ticket.notes);
        const tier = noteMap.ticketTier || "Tier 1";

        return {
          id: ticket.id,
          label: tier,
          tier,
          reference: `Ticket ID: #${ticket.id.slice(-8).toUpperCase()}`,
          price: Number(ticket.price),
          refundable: true,
          createdAt: ticket.createdAt,
          eventName: ticket.event.name,
        };
      });

    return NextResponse.json({ tickets: availableTickets }, { status: 200 });
  } catch (error) {
    console.error("Failed to load user tickets:", error);
    return NextResponse.json(
      { error: "Failed to load purchased tickets" },
      { status: 500 }
    );
  }
}