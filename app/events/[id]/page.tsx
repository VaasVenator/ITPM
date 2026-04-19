import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/server-auth";
import { TicketForm } from "@/components/forms/ticket-form";
import { VoteButton } from "@/components/forms/vote-button";

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
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replace(/[^\d]/g, ""))
          : NaN;

    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return 250;
}

function readTicketPrice(customFields: unknown): number {
  const obj = asObject(customFields);
  const candidates = [obj.ticketPrice, obj["Ticket Price"], obj.price, asObject(obj.ticket).price];

  for (const value of candidates) {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replace(/[^\d.]/g, ""))
          : NaN;

    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  return 0;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const [event, user] = await Promise.all([
    prisma.event.findUnique({
      where: { id: params.id },
      include: {
        createdBy: true,
        tickets: {
          select: {
            userId: true,
            notes: true,
            approved: true
          }
        },
        _count: {
          select: {
            votes: true
          }
        }
      }
    }),
    getSessionUser()
  ]);

  if (!event || !event.approved || !event.published || event.deleted) {
    notFound();
  }

  const eventDate = new Date(event.date);
  const createdAt = new Date(event.createdAt);
  const customFields = asObject(event.customFields);
  const detailEntries = Object.entries(customFields)
    .filter(([key]) => !["ticketPrice", "Ticket Price", "ticketQty", "price", "ticket"].includes(key))
    .map(([key, value]) => [key, String(value ?? "").trim()] as const)
    .filter(([, value]) => value.length > 0);
  const extendedDetailEntries = [
    ...detailEntries,
    ["Created On", `${formatDate(createdAt)} • ${formatTime(createdAt)}`] as const
  ];

  const ticketPrice = readTicketPrice(event.customFields);
  const seatCapacity = event.ticketRequired ? readSeatCapacity(event.customFields) : 0;
  const reservedSeats = event.ticketRequired
    ? event.tickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0)
    : 0;
  const seatsLeft = event.ticketRequired ? Math.max(0, seatCapacity - reservedSeats) : 0;
  const userTickets = user
    ? event.tickets
        .filter((ticket) => ticket.userId === user.id)
        .reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0)
    : 0;
  const remainingForUser = user ? Math.max(0, 5 - userTickets) : 5;
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

  const isEventFinished = eventDate.getTime() <= Date.now();
  const averageRating =
    approvedReviews.length === 0
      ? 0
      : Number((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length).toFixed(1));

  return (
    <article className="space-y-8">
      <div className="space-y-8">
        <section className="surface-card overflow-hidden p-0">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {event.eventImage ? (
              <img
                src={event.eventImage}
                alt={`${event.name} banner`}
                className="h-[19rem] w-full object-cover md:h-[26rem]"
              />
            ) : (
              <div className="flex h-[19rem] w-full items-center justify-center bg-[linear-gradient(135deg,#0f172a,#1e293b_55%,#10b981)] text-sm font-semibold text-white md:h-[26rem]">
                No preview available
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent px-6 py-6 text-white md:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/25 bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-md">
                  {event.category}
                </span>
                <span className="rounded-full border border-emerald-200/35 bg-emerald-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-50 shadow-sm backdrop-blur-md">
                  {event.ticketRequired ? "Ticket Required" : "RSVP Open"}
                </span>
                {event.cancelled ? (
                  <span className="rounded-full border border-red-200/35 bg-red-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-50 shadow-sm backdrop-blur-md">
                    Cancelled
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{event.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 md:text-base">
                {event.description?.trim() || "Explore the full event profile, organiser details, and participation flow from one page."}
              </p>
            </div>
          </div>
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Date</p>
              <p className="mt-2 text-sm font-bold text-primary">{formatDate(eventDate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Time</p>
              <p className="mt-2 text-sm font-bold text-primary">{formatTime(eventDate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Location</p>
              <p className="mt-2 text-sm font-bold text-primary">{event.location}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-highlight/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Organiser</p>
              <Link href={`/organisers/${event.createdBy.id}`} className="mt-2 block text-sm font-bold text-primary hover:text-accent hover:underline">
                {event.createdBy.name}
                {event.createdBy.organiserBadge ? " • Organiser" : ""}
              </Link>
            </div>
          </div>

          {extendedDetailEntries.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {extendedDetailEntries.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{label}</p>
                  <p className="mt-3 text-sm leading-6 text-primary">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-primary">Join this event</h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-primary">
              {event.ticketRequired ? `LKR ${ticketPrice.toFixed(2)}` : "Free RSVP"}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-secondary">
            {event.ticketRequired ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Available seats</p>
                  <p className="mt-2 text-xl font-bold text-primary">{seatsLeft}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Your remaining limit</p>
                  <p className="mt-2 text-xl font-bold text-primary">{remainingForUser}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Organiser votes</p>
                  <p className="mt-2 text-xl font-bold text-primary">{event._count.votes}</p>
                </div>
              </div>
            ) : (
              <p>RSVP is open for this event. Vote to confirm participation and support the organiser if you enjoyed their work.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!user ? (
              <Link href={`/login?redirect=/events/${event.id}`} className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Log in to continue
              </Link>
            ) : event.ticketRequired ? (
              remainingForUser <= 0 ? (
                <button disabled className="inline-flex items-center justify-center rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white">
                  Ticket limit reached
                </button>
              ) : (
                <a href="#ticket-purchase" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Buy tickets
                </a>
              )
            ) : (
              <VoteButton eventId={event.id} voteType="RSVP" label="RSVP Now" />
            )}

            <VoteButton eventId={event.id} voteType="ORGANISER_VOTE" label="Vote for organiser" />
          </div>
        </section>

        <section className="surface-card space-y-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mt-1 text-2xl font-black text-primary">Event Rating</h2>
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
              Please{" "}
              <Link href={`/login?redirect=/events/${event.id}`} className="font-semibold text-accent hover:underline">
                log in
              </Link>{" "}
              to submit your review.
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
                  <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">
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

        {event.ticketRequired ? (
          <section id="ticket-purchase" className="surface-card p-3 md:p-4">
            {user ? (
              <TicketForm
                eventId={event.id}
                eventName={event.name}
                eventDate={`${formatDate(eventDate)} at ${formatTime(eventDate)}`}
                eventVenue={event.location}
                posterImage={event.eventImage}
                remainingForUser={remainingForUser}
                seatsLeft={seatsLeft}
                currentUserName={user.name}
                currentUserEmail={user.email}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-secondary">
                Please <Link href={`/login?redirect=/events/${event.id}`} className="font-semibold text-accent hover:underline">log in</Link> to buy tickets for this event.
              </div>
            )}
          </section>
        ) : null}

      </div>
    </article>
  );
}
