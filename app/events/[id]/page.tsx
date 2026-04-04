import Link from "next/link";
import { notFound } from "next/navigation";
import { VoteButton } from "@/components/forms/vote-button";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";
import { StepHeader } from "@/components/tickets/step-header";
import { VoteButton } from "@/components/forms/vote-button";

type EventSpotlightPageProps = {
  params: {
    id: string;
  };
};

export default async function EventSpotlightPage({
  params
}: EventSpotlightPageProps) {
  const [event, user] = await Promise.all([
    prisma.event.findFirst({
      where: {
        id: params.id,
        deleted: false
      },
      include: {
        createdBy: true
      }
    }),
    getSessionUser()
  ]);

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
  let approvedReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    anonymous: boolean;
    createdAt: Date;
    user: { id: string; name: string; profileImage: string | null };
  }> = [];
  let myReview: { moderationStatus: string; rating: number; anonymous: boolean; comment: string } | null = null;
  let reviewFeatureUnavailable = false;

  try {
    const eventReviewModel = (prisma as { eventReview?: any }).eventReview;

    if (!eventReviewModel) {
      reviewFeatureUnavailable = true;
    } else {
    [approvedReviews, myReview] = await Promise.all([
      eventReviewModel.findMany({
        where: {
          eventId: event.id,
          moderationStatus: "APPROVED"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      user
        ? eventReviewModel.findUnique({
            where: {
              eventId_userId: {
                eventId: event.id,
                userId: user.id
              }
            }
          })
        : Promise.resolve(null)
    ]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("eventreview") || message.includes("does not exist") || message.includes("unknown argument")) {
      reviewFeatureUnavailable = true;
      approvedReviews = [];
      myReview = null;
    } else {
      throw error;
    }
  }

  const eventDate = new Date(event.date);
  const isEventFinished = eventDate.getTime() <= Date.now();
  const averageRating =
    approvedReviews.length === 0
      ? 0
      : Number(
          (approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length).toFixed(1)
        );

  const eventDetailsHref = `/events/${event.id}/details` as Route;
  const ticketDetailsHref = `/events/${event.id}/tickets` as Route;
  const loginWithRedirectHref = `/login?redirect=/events/${event.id}` as Route;

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
            {event.ticketRequired ? (
              <Link
                href={ticketDetailsHref}
                className="inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Buy Tickets
              </Link>
            ) : (
              <VoteButton eventId={event.id} voteType="RSVP" label="RSVP Vote" />
            )}
          </div>
        </div>

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
            <div className="flex h-72 w-full items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-secondary">
              No preview available
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Community Reviews</p>
            <h3 className="mt-1 text-2xl font-black text-primary">Event Rating</h3>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-highlight/40 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase text-secondary">Average Rating</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {averageRating.toFixed(1)} / 5 ({approvedReviews.length})
            </p>
          </div>
        </div>

        {reviewFeatureUnavailable ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Review data is temporarily unavailable in this database.
          </p>
        ) : !isEventFinished ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-secondary">
            Reviews open after the event date and time.
          </p>
        ) : !user ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-secondary">
            Please <Link href={loginWithRedirectHref} className="font-semibold text-accent hover:underline">log in</Link> to submit your review.
          </p>
        ) : myReview && myReview.moderationStatus !== "PENDING" ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-secondary">
            Your review is already {myReview.moderationStatus.toLowerCase()} and can no longer be edited.
          </p>
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-primary">
              {myReview ? "Edit Your Pending Review" : "Write a Review"}
            </p>

            <form action={`/api/events/${event.id}/reviews`} method="post" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-secondary">
                  Rating (1-5)
                  <input
                    name="rating"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={myReview?.rating ?? 5}
                    className="w-full rounded-lg border border-slate-300 p-2"
                    required
                  />
                </label>

                <label className="inline-flex items-center gap-2 self-end text-sm font-medium text-primary">
                  <input
                    name="anonymous"
                    type="checkbox"
                    value="true"
                    defaultChecked={myReview?.anonymous ?? false}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Post anonymously
                </label>
              </div>

              <label className="block space-y-1 text-sm text-secondary">
                Comment
                <textarea
                  name="comment"
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  defaultValue={myReview?.comment ?? ""}
                  className="w-full rounded-lg border border-slate-300 p-2"
                  placeholder="Share your experience"
                  required
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
                  {myReview ? "Update Pending Review" : "Submit Review"}
                </button>
              </div>
            </form>

            {myReview ? (
              <form action={`/api/events/${event.id}/reviews/delete`} method="post">
                <button className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-300">
                  Delete Pending Review
                </button>
              </form>
            ) : null}
          </div>
        )}

        <div className="space-y-3">
          {approvedReviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">
                  {review.anonymous ? "Anonymous" : review.user.name}
                </p>
                <p className="text-secondary">{new Date(review.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-1 font-medium text-accent">Rating: {review.rating}/5</p>
              <p className="mt-2 text-secondary">{review.comment}</p>
            </article>
          ))}
          {approvedReviews.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-secondary">
              No approved reviews yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}







