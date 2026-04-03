import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
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

  if (!event || !event.approved || !event.published) {
    notFound();
  }

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
    <div className="mx-auto max-w-4xl space-y-6">
      <StepHeader title="Event Spotlight" activeStep={1} />

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Event Details
            </p>
            <h2 className="mt-2 text-3xl font-black text-primary">{event.name}</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              {event.description || "Join this event and complete your ticket purchase in a simple guided flow."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-secondary">Time</p>
              <p className="mt-2 text-sm font-bold text-primary">
                {eventDate.toLocaleTimeString("en-LK", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-secondary">Date</p>
              <p className="mt-2 text-sm font-bold text-primary">
                {eventDate.toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase text-secondary">Venue</p>
              <p className="mt-2 text-sm font-bold text-primary">{event.location}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={eventDetailsHref}
              className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Details
            </Link>

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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {event.eventImage ? (
            <img
              src={event.eventImage}
              alt={`${event.name} poster`}
              className="h-72 w-full rounded-xl object-cover"
            />
          ) : (
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




