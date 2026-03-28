import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type AdminView =
  | "pending-events"
  | "published-events"
  | "cancelled-events"
  | "deleted-events"
  | "pending-tickets"
  | "review-history";

const VIEWS: Array<{ id: AdminView; label: string }> = [
  { id: "pending-events", label: "Pending Event Approvals" },
  { id: "published-events", label: "Published Events" },
  { id: "cancelled-events", label: "Cancelled Events" },
  { id: "deleted-events", label: "Deleted Events" },
  { id: "pending-tickets", label: "Pending Ticket Slips" },
  { id: "review-history", label: "Review History" }
];

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

async function loadAdminData() {
  let supportsEventReviewHistory = true;
  let supportsTicketReviewHistory = true;

  let events;
  let reviewedEvents;
  try {
    [events, reviewedEvents] = await Promise.all([
      prisma.event.findMany({
        where: { deleted: false, reviewStatus: "PENDING" },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.event.findMany({
        where: { reviewStatus: { not: "PENDING" } },
        include: { createdBy: true },
        orderBy: { reviewedAt: "desc" }
      })
    ]);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unknown argument `reviewStatus`")) {
      throw error;
    }

    supportsEventReviewHistory = false;
    [events, reviewedEvents] = await Promise.all([
      prisma.event.findMany({
        where: { deleted: false, approved: false },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" }
      }),
      Promise.resolve([])
    ]);
  }

  let tickets;
  let reviewedTickets;
  try {
    [tickets, reviewedTickets] = await Promise.all([
      prisma.ticket.findMany({
        where: { reviewStatus: "PENDING" },
        include: { event: true, user: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.ticket.findMany({
        where: { reviewStatus: { not: "PENDING" } },
        include: { event: true, user: true },
        orderBy: { reviewedAt: "desc" }
      })
    ]);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unknown argument `reviewStatus`")) {
      throw error;
    }

    supportsTicketReviewHistory = false;
    [tickets, reviewedTickets] = await Promise.all([
      prisma.ticket.findMany({
        where: { approved: false },
        include: { event: true, user: true },
        orderBy: { createdAt: "desc" }
      }),
      Promise.resolve([])
    ]);
  }

  const [publishedEvents, cancelledEvents, deletedEvents] = await Promise.all([
    prisma.event.findMany({
      where: { approved: true, published: true, deleted: false },
      include: { createdBy: true },
      orderBy: { date: "asc" }
    }),
    prisma.event.findMany({
      where: { cancelled: true, deleted: false },
      include: { createdBy: true },
      orderBy: { date: "desc" }
    }),
    prisma.event.findMany({
      where: { deleted: true },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return {
    events,
    tickets,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    reviewedEvents,
    reviewedTickets,
    supportsReviewHistory: supportsEventReviewHistory && supportsTicketReviewHistory
  };
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { view?: string };
}) {
  const user = await getSessionUser();

  if (!user || user.role !== "admin") {
    return <p className="surface-card p-5 text-sm text-secondary">Admin access only.</p>;
  }

  const activeView: AdminView = VIEWS.some((v) => v.id === searchParams?.view)
    ? (searchParams?.view as AdminView)
    : "pending-events";

  const {
    events,
    tickets,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    reviewedEvents,
    reviewedTickets,
    supportsReviewHistory
  } = await loadAdminData();

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{events.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Tickets</p>
          <p className="mt-2 text-2xl font-bold text-primary">{tickets.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Published Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{publishedEvents.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Reviewed Items</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {reviewedEvents.length + reviewedTickets.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((view) => (
          <Link
            key={view.id}
            href={`/admin?view=${view.id}`}
            className={
              activeView === view.id
                ? "rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg bg-highlight px-3 py-2 text-sm font-semibold text-primary transition hover:bg-emerald-100"
            }
          >
            {view.label}
          </Link>
        ))}
      </div>

      {activeView === "pending-events" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Event Approvals</h2>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    {event.eventImage ? (
                      <img
                        src={event.eventImage}
                        alt={`${event.name} poster`}
                        className="mb-3 h-40 w-full rounded-xl border border-slate-200 object-cover"
                      />
                    ) : null}

                    <p className="font-semibold text-primary">
                      {event.name} by{" "}
                      <Link className="text-accent hover:underline" href={`/organisers/${event.createdBy.id}`}>
                        {event.createdBy.name}
                      </Link>
                    </p>

                    <p className="mt-1 text-secondary">Category: {event.category}</p>
                    <p className="text-secondary">Date & Time: {new Date(event.date).toLocaleString()}</p>
                    <p className="text-secondary">Location: {event.location}</p>
                    <p className="mt-2 text-secondary">Description: {event.description || "N/A"}</p>
                    <p className="mt-2 text-secondary">Ticket Required: {event.ticketRequired ? "Yes" : "No"}</p>
                    <p className="text-secondary">Submitted At: {new Date(event.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-highlight/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Requested By</p>
                    <p className="mt-2 text-sm font-semibold text-primary">{event.createdBy.name}</p>
                    <p className="mt-1 text-xs text-secondary break-all">{event.createdBy.email}</p>
                    <p className="mt-2 text-xs text-secondary">
                      Current Review Status:{" "}
                      <span className="font-semibold text-primary">
                        {"reviewStatus" in event ? event.reviewStatus : "PENDING"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={`/api/admin/events/${event.id}/approve`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">
                      Approve Event
                    </button>
                  </form>

                  <form action={`/api/admin/events/${event.id}/reject`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Reason is required"
                      required
                    />
                    <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                      Reject Event
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {events.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending events.</p> : null}
          </div>
        </div>
      )}

      {activeView === "pending-tickets" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Ticket Slips</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{ticket.user.name} • {ticket.event.name}</p>
                <p className="mt-1 text-secondary">Quantity: {parseTicketQuantity(ticket.notes)}</p>
                <p className="text-secondary">Amount per ticket: LKR {Number(ticket.price).toFixed(2)}</p>
                <p className="text-secondary">
                  Total amount: LKR {(Number(ticket.price) * parseTicketQuantity(ticket.notes)).toFixed(2)}
                </p>

                {ticket.paymentSlip.startsWith("data:image/") ? (
                  <img
                    src={ticket.paymentSlip}
                    alt={`Bank slip for ${ticket.user.name}`}
                    className="mt-2 h-56 w-full rounded-xl border border-slate-200 object-contain bg-white"
                  />
                ) : (
                  <p className="mt-1 break-all text-secondary">Slip: {ticket.paymentSlip}</p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={`/api/admin/tickets/${ticket.id}/approve`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">
                      Approve Ticket Slip
                    </button>
                  </form>

                  <form action={`/api/admin/tickets/${ticket.id}/reject`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Reason is required"
                      required
                    />
                    <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                      Reject Ticket Slip
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {tickets.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending ticket approvals.</p> : null}
          </div>
        </div>
      )}

      {activeView === "review-history" && (
        <div className="space-y-6">
          {!supportsReviewHistory ? (
            <p className="surface-card p-4 text-sm text-secondary">
              Review history is not available yet because this database is still using the older admin approval schema.
            </p>
          ) : null}

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed Events</h2>
            <div className="space-y-3">
              {reviewedEvents.map((event) => (
                <div key={event.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="text-secondary">Organiser: {event.createdBy.name}</p>
                  <p className="text-secondary">Status: {event.reviewStatus}</p>
                  <p className="text-secondary">Comment: {event.adminComment || "N/A"}</p>
                  <p className="text-secondary">Reviewed At: {event.reviewedAt ? new Date(event.reviewedAt).toLocaleString() : "N/A"}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed Tickets</h2>
            <div className="space-y-3">
              {reviewedTickets.map((ticket) => (
                <div key={ticket.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">{ticket.user.name} • {ticket.event.name}</p>
                  <p className="text-secondary">Status: {ticket.reviewStatus}</p>
                  <p className="text-secondary">Comment: {ticket.adminComment || "N/A"}</p>
                  <p className="text-secondary">Reviewed At: {ticket.reviewedAt ? new Date(ticket.reviewedAt).toLocaleString() : "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeView === "published-events" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Published Events</h2>
          <div className="space-y-3">
            {publishedEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name}</p>
                <p className="mt-1 text-secondary">{new Date(event.date).toLocaleString()} • {event.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === "cancelled-events" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Cancelled Events</h2>
          <div className="space-y-3">
            {cancelledEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name}</p>
                <p className="mt-1 text-secondary">{new Date(event.date).toLocaleString()} • {event.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === "deleted-events" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Deleted Events</h2>
          <div className="space-y-3">
            {deletedEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name}</p>
                <p className="mt-1 text-secondary">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
