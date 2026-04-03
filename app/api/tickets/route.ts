import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_TICKET_PRICES = new Set([1500, 2500, 5000]);

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readSeatCapacity(customFields: unknown): number {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) {
    return 250;
  }

  const obj = customFields as Record<string, unknown>;
  const candidates = [obj.ticketQty, obj.seatCount, obj.seats, obj.capacity, obj.ticketCount];

  for (const value of candidates) {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^\d]/g, "")) : NaN;
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return 250;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to buy tickets." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const eventId = String(body?.eventId ?? "").trim();
    const paymentSlip = String(body?.paymentSlip ?? "").trim();
    const displayedPrice = String(body?.displayedPrice ?? "").trim();
    const ticketTier = String(body?.ticketTier ?? "").trim();
    const guestName = String(body?.guestName ?? "").trim();
    const guestEmail = String(body?.guestEmail ?? "").trim();
    const guestPhone = String(body?.guestPhone ?? "").trim();
    const extraNotes = String(body?.notes ?? "").trim();
    const quantity = Number(body?.quantity);

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
    }

    if (!paymentSlip.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid bank slip image is required." }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1." }, { status: 400 });
    }

    const normalizedPrice = Number(displayedPrice.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return NextResponse.json({ error: "Invalid ticket price." }, { status: 400 });
    }

    if (!ALLOWED_TICKET_PRICES.has(normalizedPrice)) {
      return NextResponse.json({ error: "Unsupported ticket tier price." }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        approved: true,
        published: true,
        deleted: true,
        cancelled: true,
        ticketRequired: true,
        customFields: true
      }
    });

    if (!event || !event.approved || !event.published || event.deleted || event.cancelled) {
      return NextResponse.json({ error: "This event is not available for ticket purchase." }, { status: 404 });
    }

    if (!event.ticketRequired) {
      return NextResponse.json({ error: "This event does not require tickets." }, { status: 400 });
    }

    const previousTickets = await prisma.ticket.findMany({
      where: { eventId, userId: user.id },
      select: { notes: true }
    });

    const boughtByUser = previousTickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);

    if (boughtByUser + quantity > 5) {
      return NextResponse.json(
        { error: `You can only buy up to 5 tickets per event. Remaining: ${Math.max(0, 5 - boughtByUser)}.` },
        { status: 400 }
      );
    }

    const totalReserved = await prisma.ticket.findMany({
      where: { eventId },
      select: { notes: true }
    });

    const seatCapacity = readSeatCapacity(event.customFields);
    const seatsLeft = seatCapacity - totalReserved.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);

    if (quantity > seatsLeft) {
      return NextResponse.json(
        { error: `Only ${Math.max(0, seatsLeft)} seat(s) are left for this event.` },
        { status: 400 }
      );
    }

    const noteParts = [
      `quantity:${quantity}`,
      ticketTier ? `ticketTier:${ticketTier}` : "",
      guestName ? `guestName:${guestName}` : "",
      guestEmail ? `guestEmail:${guestEmail}` : "",
      guestPhone ? `guestPhone:${guestPhone}` : "",
      extraNotes ? `notes:${extraNotes}` : ""
    ].filter(Boolean);

    await prisma.ticket.create({
      data: {
        eventId,
        userId: user.id,
        price: normalizedPrice,
        paymentSlip,
        notes: noteParts.join(" | ")
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ticket creation error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

