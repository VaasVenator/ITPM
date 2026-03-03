import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketForm } from "@/components/forms/ticket-form";
import { VoteButton } from "@/components/forms/vote-button";

function readTicketPrice(customFields: unknown): string {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) {
    return "0.00";
  }

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
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value.toFixed(2);
    if (typeof value === "string") {
      const normalized = Number(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(normalized) && normalized > 0) return normalized.toFixed(2);
    }
  }

  return "0.00";
}

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { createdBy: true } });
  if (!event || !event.approved || !event.published || event.deleted) notFound();
  const ticketPrice = readTicketPrice(event.customFields);

  return (
    <article className="surface-card space-y-5 p-7">
      {event.eventImage ? (
        <img src={event.eventImage} alt={`${event.name} poster`} className="h-64 w-full rounded-xl object-cover" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700">{event.category}</p>
        {event.cancelled ? (
          <p className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-rose-700">
            Cancelled
          </p>
        ) : null}
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-primary">{event.name}</h1>
      <p className="text-secondary">{event.description}</p>
      <p className="text-sm text-secondary">{event.location} • {new Date(event.date).toLocaleString()}</p>
      <p className="text-sm text-primary">Organiser: {event.createdBy.name} {event.createdBy.organiserBadge ? <span className="ml-1 rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-emerald-700">Organiser</span> : null}</p>

      {event.ticketRequired ? (
        <TicketForm eventId={event.id} price={ticketPrice} />
      ) : (
        <VoteButton eventId={event.id} voteType="RSVP" label="RSVP for this event" />
      )}

      <VoteButton eventId={event.id} voteType="ORGANISER_VOTE" label="Vote for organiser" />
    </article>
  );
}
