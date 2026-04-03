import Link from "next/link";
import { notFound } from "next/navigation";
import { VoteButton } from "@/components/forms/vote-button";
import { prisma } from "@/lib/prisma";

const TICKET_TIERS = [
  { key: "standard", label: "Standard Access", price: 2500, note: "Full-day event access" },
  { key: "early-bird", label: "Early Bird", price: 1500, note: "Limited discounted release" },
  { key: "executive-vip", label: "Executive VIP", price: 5000, note: "Priority seating and premium zone" }
] as const;

function asObject(customFields: unknown): Record<string, unknown> {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) {
    return {};
  }

  return customFields as Record<string, unknown>;
}

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readSeatCapacity(customFields: unknown): number {
  const obj = asObject(customFields);
  const candidates = [obj.ticketQty, obj.seatCount, obj.seats, obj.capacity, obj.ticketCount];

  for (const value of candidates) {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^\d]/g, "")) : NaN;
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return 250;
}

function asNarrativeBlocks(customFields: unknown): Array<[string, string]> {
  const obj = asObject(customFields);

  return Object.entries(obj)
    .filter(([key]) => !["ticketPrice", "Ticket Price", "ticketQty"].includes(key))
    .map(([key, value]) => [key, String(value ?? "").trim()] as [string, string])
    .filter(([, value]) => value.length > 0);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-LK").format(value);
}

function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-LK", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { createdBy: true, tickets: { select: { notes: true } } }
  });

  if (!event || !event.approved || !event.published || event.deleted) notFound();

  const customFieldEntries = asNarrativeBlocks(event.customFields);
  const eventDate = new Date(event.date);
  const seatCapacity = event.ticketRequired ? readSeatCapacity(event.customFields) : 0;
  const reservedSeats = event.ticketRequired
    ? event.tickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0)
    : 0;
  const seatsLeft = event.ticketRequired ? Math.max(0, seatCapacity - reservedSeats) : 0;
  const soldPercent =
    event.ticketRequired && seatCapacity > 0 ? Math.min(100, Math.round((reservedSeats / seatCapacity) * 100)) : 0;

  return (
    <article className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_22rem]">
      <div className="space-y-8">
        <section className="surface-card overflow-hidden p-3 md:p-4">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
            {event.eventImage ? (
              <img
                src={event.eventImage}
                alt={`${event.name} banner`}
                className="h-[18rem] w-full object-cover md:h-[24rem]"
              />
            ) : (
              <div className="h-[18rem] w-full bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_30%),linear-gradient(135deg,_#0f172a,_#1e293b_55%,_#10b981)] md:h-[24rem]" />
            )}
          </div>

          <div className="px-2 pb-2 pt-6 md:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                {event.category}
              </span>
              <span className="inline-flex rounded-full bg-highlight px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                {event.ticketRequired ? "Ticketed Event" : "Open Event"}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-primary md:text-5xl">
              {event.name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-sm font-medium text-secondary">
              <p>{formatEventDate(eventDate)}</p>
              <p>{event.location}</p>
              <p>{formatEventTime(eventDate)}</p>
            </div>
          </div>
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-10 rounded-full bg-accent" />
            <h2 className="text-2xl font-black tracking-tight text-primary">Event Narrative</h2>
          </div>

          <p className="mt-5 text-sm leading-7 text-secondary md:text-base">
            {event.description?.trim() ||
              "This event page highlights the full experience, ticket options, and venue details so students can reserve seats with confidence."}
          </p>

          {customFieldEntries.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {customFieldEntries.map(([label, value]) => (
                <div key={label} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{label}</p>
                  <p className="mt-3 text-sm leading-6 text-primary">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="surface-card p-6 md:p-8">
          <h2 className="text-2xl font-black tracking-tight text-primary">Event Access</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {TICKET_TIERS.map((tier) => (
              <div
                key={tier.key}
                className={`rounded-[1.5rem] border p-5 ${
                  tier.key === "executive-vip"
                    ? "border-primary bg-primary text-white"
                    : tier.key === "early-bird"
                      ? "border-emerald-200 bg-highlight/60"
                      : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-[0.18em] ${
                    tier.key === "executive-vip" ? "text-slate-200" : "text-secondary"
                  }`}
                >
                  {tier.label}
                </p>
                <p className="mt-4 text-3xl font-black">Rs. {formatMoney(tier.price)}</p>
                <p
                  className={`mt-2 text-sm ${
                    tier.key === "executive-vip" ? "text-slate-200" : "text-secondary"
                  }`}
                >
                  {tier.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="reserve-seat" className="surface-card p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Reservation</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-primary">Reserve Your Seat</h2>
            </div>
            <Link
              href={`/organisers/${event.createdBy.id}`}
              className="inline-flex rounded-full border border-emerald-200 bg-highlight px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"
            >
              Hosted by {event.createdBy.name}
            </Link>
          </div>

          {event.ticketRequired ? (
            <div className="space-y-4">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Please complete RSVP details first before reserving your seat.
              </p>
              <Link
                href={{
                  pathname: `/events/${event.id}/rsvp`,
                  query: { next: "tickets" }
                }}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Reserve Your Seat
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Complete your RSVP details to confirm attendance for this event.
              </p>
              <Link
                href={{
                  pathname: `/events/${event.id}/rsvp`
                }}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                RSVP for this event
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="surface-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
            Registration Status
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-primary">
              {event.ticketRequired ? seatsLeft : "Open"}
            </span>
            {event.ticketRequired ? (
              <span className="pb-2 text-sm font-semibold text-secondary">
                / {seatCapacity} seats left
              </span>
            ) : null}
          </div>

          {event.ticketRequired ? (
            <>
              <div className="mt-5 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${100 - soldPercent}%` }} />
              </div>
              <p className="mt-3 text-sm text-secondary">
                {reservedSeats} seat(s) already reserved for this event.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-secondary">RSVP is currently available for all students.</p>
          )}

          {event.ticketRequired ? (
            <div className="mt-6 space-y-3">
              {TICKET_TIERS.map((tier) => (
                <div key={tier.key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-primary">{tier.label}</p>
                      <p className="mt-1 text-xs text-secondary">{tier.note}</p>
                    </div>
                    <span className="text-sm font-black text-primary">Rs. {formatMoney(tier.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {event.ticketRequired ? (
            <Link
              href={{
                pathname: `/events/${event.id}/rsvp`,
                query: { next: "tickets" }
              }}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Reserve Your Seat
            </Link>
          ) : (
            <Link
              href={{
                pathname: `/events/${event.id}/rsvp`
              }}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Reserve your seat 
            </Link>
          )}
        </section>

        <section className="surface-card overflow-hidden p-0">
          {event.eventImage ? (
            <img
              src={event.eventImage}
              alt={`${event.name} venue preview`}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="h-44 w-full bg-gradient-to-br from-slate-100 via-white to-emerald-100" />
          )}
          <div className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-secondary">
              Venue Logistics
            </p>
            <p className="mt-4 text-lg font-black text-primary">{event.location}</p>
            <p className="mt-2 text-sm leading-6 text-secondary">
              {event.ticketRequired
                ? "Use the RSVP page first, then continue to ticket selection and complete the booking with your payment slip."
                : "Use the RSVP page to confirm your participation and stay updated with organiser announcements."}
            </p>
          </div>
        </section>

        <section className="surface-card p-5">
          <p className="text-sm font-bold text-primary">Need Assistance?</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            For ticketing support, accessibility requests, or seat-related questions, please contact the organiser before the event date.
          </p>
          <div className="mt-4">
            <VoteButton eventId={event.id} voteType="ORGANISER_VOTE" label="Vote for organiser" />
          </div>
        </section>
      </aside>
    </article>
  );
}












