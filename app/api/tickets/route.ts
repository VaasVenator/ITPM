import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function parseTicketPrice(customFields: unknown): number {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) return NaN;
  const obj = customFields as Record<string, unknown>;
  const candidates = [
    obj.ticketPrice,
    obj["Ticket Price"],
    obj.price,
    typeof obj.ticket === "object" && obj.ticket && !Array.isArray(obj.ticket)
      ? (obj.ticket as Record<string, unknown>).price
      : undefined
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const normalized = Number(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(normalized)) return normalized;
    }
  }
  return NaN;
}

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { eventId, paymentSlip, displayedPrice, quantity } = body;

    if (!eventId || !paymentSlip) {
      return NextResponse.json({ error: "eventId and paymentSlip required" }, { status: 400 });
    }

    if (typeof paymentSlip !== "string" || !paymentSlip.startsWith("data:image/")) {
      return NextResponse.json({ error: "Bank slip must be an image upload." }, { status: 400 });
    }

    const requestedQty = Number(quantity);
    if (!Number.isInteger(requestedQty) || requestedQty < 1 || requestedQty > 5) {
      return NextResponse.json({ error: "Quantity must be between 1 and 5." }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { ticketRequired: true, approved: true, published: true, deleted: true, cancelled: true, customFields: true }
    });

    if (!event || event.deleted) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (!event.ticketRequired || !event.approved || !event.published || event.cancelled) {
      return NextResponse.json({ error: "Ticket purchase is not available for this event." }, { status: 400 });
    }

    const previousTickets = await prisma.ticket.findMany({
      where: { eventId, userId: user.id },
      select: { notes: true }
    });
    const alreadyBought = previousTickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);
    const remainingForUser = 5 - alreadyBought;
    if (remainingForUser <= 0) {
      return NextResponse.json({ error: "You have already reached the maximum of 5 tickets for this event." }, { status: 400 });
    }
    if (requestedQty > remainingForUser) {
      return NextResponse.json({ error: `You can only buy ${remainingForUser} more ticket(s) for this event.` }, { status: 400 });
    }

    let normalizedPrice = parseTicketPrice(event.customFields);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      if (typeof displayedPrice === "string" || typeof displayedPrice === "number") {
        const fallback = Number(String(displayedPrice).replace(/[^\d.]/g, ""));
        if (Number.isFinite(fallback) && fallback >= 0) {
          normalizedPrice = fallback;
        }
      }
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return NextResponse.json(
        { error: "Ticket price is not configured for this event. Ask the organiser/admin to update the event ticket price." },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        eventId,
        userId: user.id,
        price: normalizedPrice,
        paymentSlip,
        notes: `quantity:${requestedQty}`,
        approved: false
      }
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error: "Could not submit payment slip.",
        debug: process.env.NODE_ENV === "production" ? undefined : message
      },
      { status: 500 }
    );
  }
}
