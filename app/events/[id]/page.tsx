import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketForm } from "@/components/forms/ticket-form";
import { VoteButton } from "@/components/forms/vote-button";

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id }, include: { createdBy: true } });
  if (!event || !event.approved || !event.published) notFound();

  return (
    <article className="surface-card space-y-5 p-7">
      <p className="inline-flex rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700">{event.category}</p>
      <h1 className="text-3xl font-bold tracking-tight text-primary">{event.name}</h1>
      <p className="text-secondary">{event.description}</p>
      <p className="text-sm text-secondary">{event.location} • {new Date(event.date).toLocaleString()}</p>
      <p className="text-sm text-primary">Organiser: {event.createdBy.name} {event.createdBy.organiserBadge ? <span className="ml-1 rounded-full bg-highlight px-2 py-0.5 text-xs font-semibold text-emerald-700">Organiser</span> : null}</p>

      {event.ticketRequired ? (
        <TicketForm eventId={event.id} price="0.00" />
      ) : (
        <VoteButton eventId={event.id} voteType="RSVP" label="RSVP for this event" />
      )}

      <VoteButton eventId={event.id} voteType="ORGANISER_VOTE" label="Vote for organiser" />
    </article>
  );
}
