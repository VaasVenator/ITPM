import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TicketForm } from "@/components/forms/ticket-form";
import { VoteButton } from "@/components/forms/vote-button";
import { getSessionUser } from "@/lib/auth";

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

function asCustomFieldEntries(customFields: unknown): Array<[string, string]> {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) {
    return [];
  }

  return Object.entries(customFields as Record<string, unknown>)
    .filter(([key]) => !["ticketPrice", "Ticket Price", "ticketQty"].includes(key))
    .map(([key, value]) => [key, String(value ?? "")] as [string, string])
    .filter(([, value]) => value.trim().length > 0);
}

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { createdBy: true } });
  if (!event || !event.approved || !event.published || event.deleted) notFound();
  const ticketPrice = readTicketPrice(event.customFields);
  const customFieldEntries = asCustomFieldEntries(event.customFields);
  let boughtByUser = 0;
  if (event.ticketRequired && sessionUser) {
    const previousTickets = await prisma.ticket.findMany({
      where: { eventId: event.id, userId: sessionUser.id },
      select: { notes: true }
    });
    boughtByUser = previousTickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);
  }
  const remainingForUser = Math.max(0, 5 - boughtByUser);
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("en-LK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const formattedTime = eventDate.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <article className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
        {event.eventImage ? (
          <img src={event.eventImage} alt={`${event.name} poster`} className="h-72 w-full object-cover md:h-[26rem]" />
        ) : (
          <div className="h-72 w-full bg-gradient-to-br from-emerald-100 via-white to-slate-100 md:h-[26rem]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/30 to-transparent" />

        <div className="absolute left-0 right-0 top-0 flex flex-wrap items-center gap-2 p-4 md:p-6">
          <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-primary backdrop-blur">
            {event.category}
          </span>
          {event.cancelled ? (
            <span className="inline-flex rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Cancelled
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Live
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{event.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-100 md:text-base">
            {event.description?.trim() || "Join this university experience and be part of the crowd."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Date</p>
          <p className="mt-2 text-lg font-bold text-primary">{formattedDate}</p>
          <p className="mt-1 text-sm text-secondary">{formattedTime}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Location</p>
          <p className="mt-2 text-lg font-bold text-primary">{event.location}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Organiser</p>
          <Link href={`/organisers/${event.createdBy.id}`} className="mt-2 inline-block text-lg font-bold text-accent hover:underline">
            {event.createdBy.name}
          </Link>
          {event.createdBy.organiserBadge ? (
            <span className="mt-2 inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-emerald-700">
              Verified Organiser
            </span>
          ) : null}
        </div>
      </section>

      {customFieldEntries.length > 0 ? (
        <section className="surface-card p-5">
          <h2 className="text-lg font-bold text-primary">Event Highlights</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {customFieldEntries.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">{label}</p>
                <p className="mt-1 text-sm font-medium text-primary">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface-card p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-primary">Participation</h2>
          {event.ticketRequired ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-white">
                Ticket Required • LKR {ticketPrice}
              </span>
              <span className="inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                Remaining for you: {sessionUser ? remainingForUser : "Login to view"}
              </span>
            </div>
          ) : (
            <span className="inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
              Free RSVP
            </span>
          )}
        </div>

        {event.ticketRequired ? (
          <TicketForm eventId={event.id} price={ticketPrice} remainingForUser={remainingForUser} />
        ) : (
          <VoteButton eventId={event.id} voteType="RSVP" label="RSVP for this event" />
        )}

        <div className="mt-3">
          <VoteButton eventId={event.id} voteType="ORGANISER_VOTE" label="Vote for organiser" />
        </div>
      </section>
    </article>
  );
}
