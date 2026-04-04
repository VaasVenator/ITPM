import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {TicketSelection} from "@/components/forms/ticket-selection";
import { prisma } from "@/lib/prisma";

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

export default async function EventTicketsPage({
  params
}: {
  params: { id: string };
}) {
  const sessionUser = await getSessionUser();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      tickets: {
        select: {
          notes: true,
          userId: true
        }
      }
    }
  });

  if (!event || !event.approved || !event.published || event.deleted || event.cancelled) {
    notFound();
  }

  if (!event.ticketRequired) {
    notFound();
  }

  const seatCapacity = readSeatCapacity(event.customFields);
  const reservedSeats = event.tickets.reduce(
    (sum, ticket) => sum + parseTicketQuantity(ticket.notes),
    0
  );
  const seatsLeft = Math.max(0, seatCapacity - reservedSeats);

  const boughtByUser = sessionUser
    ? event.tickets
        .filter((ticket) => ticket.userId === sessionUser.id)
        .reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0)
    : 0;

  const remainingForUser = Math.max(0, Math.min(5 - boughtByUser, seatsLeft));

  return (
    <TicketSelection
      eventId={event.id}
      eventName={event.name}
      eventVenue={event.location}
      eventImage={event.eventImage}
      seatsLeft={seatsLeft}
      seatCapacity={seatCapacity}
      remainingForUser={remainingForUser}
      currentUserName={sessionUser?.name}
      currentUserEmail={sessionUser?.email}
    />
  );
}




