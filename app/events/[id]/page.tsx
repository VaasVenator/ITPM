import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
  const event = await prisma.event.findFirst({
    where: {
      id: params.id,
      deleted: false
    },
    include: {
      createdBy: true
    }
  });

  if (!event || !event.approved || !event.published) {
    notFound();
  }

  const eventDate = new Date(event.date);
  const eventDetailsHref = `/events/${event.id}/details` as Route;
  const ticketDetailsHref = `/events/${event.id}/tickets` as Route;

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
    </div>
  );
}







