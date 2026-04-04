import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readTicketConfig(customFields: unknown) {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) {
    return { ticketPrice: 0, ticketQty: null as number | null };
  }

  const fields = customFields as Record<string, unknown>;
  const rawPrice = fields.ticketPrice ?? fields["Ticket Price"] ?? fields.price ?? 0;
  const rawQty = fields.ticketQty ?? fields["Ticket Quantity"] ?? fields.quantity ?? null;

  const ticketPrice =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string"
        ? Number(rawPrice.replace(/[^\d.]/g, ""))
        : 0;

  const ticketQty =
    typeof rawQty === "number"
      ? rawQty
      : typeof rawQty === "string"
        ? Number(rawQty.replace(/[^\d]/g, ""))
        : null;

  return {
    ticketPrice: Number.isFinite(ticketPrice) ? ticketPrice : 0,
    ticketQty: Number.isFinite(ticketQty) ? ticketQty : null
  };
}

export default async function OrganiserEventDetailsPage({
  params
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) notFound();

  const event = await prisma.event.findFirst({
    where: {
      id: params.id,
      createdById: user.id
    },
    include: {
      tickets: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      },
      sponsors: true,
      votes: true
    }
  });

  if (!event) notFound();

  const { ticketPrice, ticketQty } = readTicketConfig(event.customFields);
  const approvedTickets = event.tickets.filter((ticket) => ticket.approved);
  const pendingTickets = event.tickets.filter((ticket) => !ticket.approved);

  const approvedQuantity = approvedTickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);
  const pendingQuantity = pendingTickets.reduce((sum, ticket) => sum + parseTicketQuantity(ticket.notes), 0);
  const approvedRevenue = approvedQuantity * ticketPrice;
  const pendingRevenue = pendingQuantity * ticketPrice;
  const remainingInventory = ticketQty !== null ? Math.max(0, ticketQty - approvedQuantity) : null;
  const rsvpCount = event.votes.filter((vote) => vote.voteType === "RSVP").length;
  const organiserVoteCount = event.votes.filter((vote) => vote.voteType === "ORGANISER_VOTE").length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Organiser Insights</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary">{event.name}</h1>
          <p className="mt-2 text-sm text-secondary">
            Monitor ticket activity, revenue progress, and event performance from one organiser view.
          </p>
        </div>

        <Link
          href="/my-events"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to My Events
        </Link>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
                {event.category}
              </span>
              {event.published ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                  Published
                </span>
              ) : event.approved ? (
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
                  Approved
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
                  Under Review
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-secondary">
              {event.description || "No organiser description was added for this event."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Date & Time</p>
                <p className="mt-1 text-sm font-semibold text-primary">{new Date(event.date).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Location</p>
                <p className="mt-1 text-sm font-semibold text-primary">{event.location}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/80 p-5 md:border-l md:border-t-0 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Quick Snapshot</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Event Created</p>
                <p className="mt-1 text-sm font-semibold text-primary">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Ticketing</p>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {event.ticketRequired ? `LKR ${ticketPrice.toFixed(2)} per ticket` : "Free RSVP Event"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Sponsors</p>
                <p className="mt-1 text-sm font-semibold text-primary">{event.sponsors.length} saved sponsor contact(s)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Approved Tickets</p>
          <p className="mt-2 text-3xl font-black text-primary">{approvedQuantity}</p>
          <p className="mt-1 text-sm text-secondary">Fully verified purchases</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Pending Tickets</p>
          <p className="mt-2 text-3xl font-black text-primary">{pendingQuantity}</p>
          <p className="mt-1 text-sm text-secondary">Waiting for admin verification</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Revenue Confirmed</p>
          <p className="mt-2 text-3xl font-black text-primary">LKR {approvedRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-secondary">From approved ticket payments</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Revenue Pending</p>
          <p className="mt-2 text-3xl font-black text-primary">LKR {pendingRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-secondary">Awaiting payment confirmation</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Ticket Inventory</p>
          <p className="mt-2 text-3xl font-black text-primary">{ticketQty ?? "-"}</p>
          <p className="mt-1 text-sm text-secondary">Configured total capacity</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Remaining Tickets</p>
          <p className="mt-2 text-3xl font-black text-primary">{remainingInventory ?? "-"}</p>
          <p className="mt-1 text-sm text-secondary">Based on approved sales</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">RSVP Votes</p>
          <p className="mt-2 text-3xl font-black text-primary">{rsvpCount}</p>
          <p className="mt-1 text-sm text-secondary">Students interested in joining</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Organiser Votes</p>
          <p className="mt-2 text-3xl font-black text-primary">{organiserVoteCount}</p>
          <p className="mt-1 text-sm text-secondary">Community support for your event</p>
        </div>
      </section>

      <section className="surface-card p-5">
          <h2 className="text-xl font-bold tracking-tight text-primary">Accounting Notes</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Confirmed Revenue</p>
              <p className="mt-2 text-2xl font-black text-primary">LKR {approvedRevenue.toFixed(2)}</p>
              <p className="mt-1 text-sm text-secondary">This is the amount supported by approved payment slips.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Awaiting Verification</p>
              <p className="mt-2 text-2xl font-black text-primary">LKR {pendingRevenue.toFixed(2)}</p>
              <p className="mt-1 text-sm text-secondary">Potential revenue still pending admin confirmation.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Sponsor Requests</p>
              <p className="mt-2 text-2xl font-black text-primary">{event.sponsors.length}</p>
              <p className="mt-1 text-sm text-secondary">Sponsor contacts saved for this event so far.</p>
            </div>
          </div>
      </section>
    </section>
  );
}
