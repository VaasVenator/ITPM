import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type AdminView = "pending-events" | "published-events" | "cancelled-events" | "deleted-events" | "pending-tickets";

const VIEWS: Array<{ id: AdminView; label: string }> = [
  { id: "pending-events", label: "Pending Event Approvals" },
  { id: "published-events", label: "Published Events" },
  { id: "cancelled-events", label: "Cancelled Events" },
  { id: "deleted-events", label: "Deleted Events" },
  { id: "pending-tickets", label: "Pending Ticket Slips" }
];

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
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

  const [events, tickets] = await Promise.all([
    prisma.event.findMany({ where: { approved: false, deleted: false }, include: { createdBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.ticket.findMany({ where: { approved: false }, include: { event: true, user: true }, orderBy: { createdAt: "desc" } })
  ]);
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

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

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

      {activeView === "pending-events" ? (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Event Approvals</h2>
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    {event.eventImage ? (
                      <img src={event.eventImage} alt={`${event.name} poster`} className="mb-3 h-40 w-full rounded-xl border border-slate-200 object-cover" />
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
                    <p className="text-secondary">Sponsor Requested: {event.sponsorRequested ? "Yes" : "No"}</p>
                    <p className="text-secondary">Sponsors Ready: {event.sponsorsReady ? "Yes" : "No"}</p>
                    <p className="text-secondary">Submitted At: {new Date(event.createdAt).toLocaleString()}</p>

                    {event.customFields && typeof event.customFields === "object" ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Custom Fields</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(event.customFields as Record<string, unknown>).map(([key, value]) => (
                            <p key={key} className="text-xs text-primary">
                              <span className="font-semibold">{key}:</span> {String(value)}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-highlight/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Requested By</p>
                    <p className="mt-2 text-sm font-semibold text-primary">{event.createdBy.name}</p>
                    <p className="mt-1 text-xs text-secondary">
                      Username: <span className="font-medium text-primary">{event.createdBy.username}</span>
                    </p>
                    <p className="text-xs text-secondary break-all">
                      Email: <span className="font-medium text-primary">{event.createdBy.email}</span>
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Account Created: <span className="font-medium text-primary">{new Date(event.createdBy.createdAt).toLocaleString()}</span>
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      Organiser Badge: <span className="font-medium text-primary">{event.createdBy.organiserBadge ? "Yes" : "No"}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  <form action={`/api/admin/events/${event.id}/approve`} method="post"><button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">Approve</button></form>
                  <form action={`/api/admin/events/${event.id}/reject`} method="post"><button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">Reject</button></form>
                </div>
              </div>
            ))}
            {events.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending events.</p> : null}
          </div>
        </div>
      ) : null}

      {activeView === "published-events" ? (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Published Events (Manage)</h2>
          <div className="space-y-3">
            {publishedEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name} by <Link className="text-accent hover:underline" href={`/organisers/${event.createdBy.id}`}>{event.createdBy.name}</Link></p>
                <p className="mt-1 text-secondary">{new Date(event.date).toLocaleString()} • {event.location}</p>
                <div className="mt-3 flex gap-3">
                  {!event.cancelled ? (
                    <form action={`/api/admin/events/${event.id}/cancel`} method="post">
                      <button className="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-white transition hover:bg-amber-600">Cancel</button>
                    </form>
                  ) : (
                    <span className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700">Cancelled</span>
                  )}
                  <form action={`/api/admin/events/${event.id}/delete`} method="post">
                    <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">Delete</button>
                  </form>
                </div>
              </div>
            ))}
            {publishedEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No published events.</p> : null}
          </div>
        </div>
      ) : null}

      {activeView === "cancelled-events" ? (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Cancelled Events</h2>
          <div className="space-y-3">
            {cancelledEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name} by <Link className="text-accent hover:underline" href={`/organisers/${event.createdBy.id}`}>{event.createdBy.name}</Link></p>
                <p className="mt-1 text-secondary">{new Date(event.date).toLocaleString()} • {event.location}</p>
              </div>
            ))}
            {cancelledEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No cancelled events.</p> : null}
          </div>
        </div>
      ) : null}

      {activeView === "deleted-events" ? (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Deleted Events</h2>
          <div className="space-y-3">
            {deletedEvents.map((event) => (
              <div key={event.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{event.name} by <Link className="text-accent hover:underline" href={`/organisers/${event.createdBy.id}`}>{event.createdBy.name}</Link></p>
                <p className="mt-1 text-secondary">{new Date(event.date).toLocaleString()} • {event.location}</p>
              </div>
            ))}
            {deletedEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No deleted events.</p> : null}
          </div>
        </div>
      ) : null}

      {activeView === "pending-tickets" ? (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Ticket Slips</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">{ticket.user.name} • {ticket.event.name}</p>
                <p className="mt-1 text-secondary">Quantity: {parseTicketQuantity(ticket.notes)}</p>
                <p className="text-secondary">Amount per ticket: LKR {Number(ticket.price).toFixed(2)}</p>
                <p className="text-secondary">Total amount: LKR {(Number(ticket.price) * parseTicketQuantity(ticket.notes)).toFixed(2)}</p>
                {ticket.paymentSlip.startsWith("data:image/") ? (
                  <img
                    src={ticket.paymentSlip}
                    alt={`Bank slip for ${ticket.user.name}`}
                    className="mt-2 h-56 w-full rounded-xl border border-slate-200 object-contain bg-white"
                  />
                ) : (
                  <p className="mt-1 break-all text-secondary">Slip: {ticket.paymentSlip}</p>
                )}
                <div className="mt-3 flex gap-3">
                  <form action={`/api/admin/tickets/${ticket.id}/approve`} method="post"><button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-brand-dark">Approve</button></form>
                  <form action={`/api/admin/tickets/${ticket.id}/reject`} method="post"><button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">Reject</button></form>
                </div>
              </div>
            ))}
            {tickets.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending ticket approvals.</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
