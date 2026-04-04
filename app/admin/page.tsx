import Link from "next/link";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { AsyncForm } from "@/components/ui/async-form";

type AdminView =
  | "pending-events"
  | "published-events"
  | "cancelled-events"
  | "deleted-events"
  | "pending-tickets"
  | "pending-refunds"
  | "review-history";

const VIEWS: Array<{ id: AdminView; label: string }> = [
  { id: "pending-events", label: "Pending Event Approvals" },
  { id: "published-events", label: "Published Events" },
  { id: "cancelled-events", label: "Cancelled Events" },
  { id: "deleted-events", label: "Deleted Events" },
  { id: "pending-tickets", label: "Pending Ticket Slips" },
  { id: "pending-refunds", label: "Pending Refunds" },
  { id: "review-history", label: "Review History" }
];

function parseTicketQuantity(notes: string | null): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

async function loadAdminData(activeView: AdminView) {
  let supportsEventReviewHistory = true;
  let supportsTicketReviewHistory = true;

  let pendingEventCount = 0;
  let reviewedEventCount = 0;
  let pendingTicketCount = 0;
  let reviewedTicketCount = 0;
  const events: any[] = [];
  const reviewedEvents: any[] = [];
  const tickets: any[] = [];
  const reviewedTickets: any[] = [];
  const publishedEvents: any[] = [];
  const cancelledEvents: any[] = [];
  const deletedEvents: any[] = [];

  try {
    pendingEventCount = await prisma.event.count({
      where: { deleted: false, reviewStatus: "PENDING" } as any
    });

    if (activeView === "pending-events") {
      events.push(
        ...(await prisma.event.findMany({
          where: { deleted: false, reviewStatus: "PENDING" } as any,
          include: { createdBy: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    reviewedEventCount = await prisma.event.count({
      where: { reviewStatus: { not: "PENDING" } } as any
    });

    if (activeView === "review-history") {
      reviewedEvents.push(
        ...(await prisma.event.findMany({
          where: { reviewStatus: { not: "PENDING" } } as any,
          include: { createdBy: true },
          orderBy: { reviewedAt: "desc" } as any
        }))
      );
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unknown argument `reviewStatus`")) {
      throw error;
    }

    supportsEventReviewHistory = false;
    pendingEventCount = await prisma.event.count({
      where: { deleted: false, approved: false }
    });

    if (activeView === "pending-events") {
      events.push(
        ...(await prisma.event.findMany({
          where: { deleted: false, approved: false },
          include: { createdBy: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }
  }

  try {
    pendingTicketCount = await prisma.ticket.count({
      where: { reviewStatus: "PENDING" } as any
    });

    if (activeView === "pending-tickets") {
      tickets.push(
        ...(await prisma.ticket.findMany({
          where: { reviewStatus: "PENDING" } as any,
          include: { event: true, user: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    reviewedTicketCount = await prisma.ticket.count({
      where: { reviewStatus: { not: "PENDING" } } as any
    });

    if (activeView === "review-history") {
      reviewedTickets.push(
        ...(await prisma.ticket.findMany({
          where: { reviewStatus: { not: "PENDING" } } as any,
          include: { event: true, user: true },
          orderBy: { reviewedAt: "desc" } as any
        }))
      );
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unknown argument `reviewStatus`")) {
      throw error;
    }

    supportsTicketReviewHistory = false;
    pendingTicketCount = await prisma.ticket.count({
      where: { approved: false }
    });

    if (activeView === "pending-tickets") {
      tickets.push(
        ...(await prisma.ticket.findMany({
          where: { approved: false },
          include: { event: true, user: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }
  }

  const [publishedEventCount, cancelledEventCount, deletedEventCount] = await Promise.all([
    prisma.event.count({ where: { approved: true, published: true, deleted: false } }),
    prisma.event.count({ where: { cancelled: true, deleted: false } }),
    prisma.event.count({ where: { deleted: true } })
  ]);

  if (activeView === "published-events") {
    publishedEvents.push(
      ...(await prisma.event.findMany({
        where: { approved: true, published: true, deleted: false },
        include: { createdBy: true },
        orderBy: { date: "asc" }
      }))
    );
  }

  if (activeView === "cancelled-events") {
    cancelledEvents.push(
      ...(await prisma.event.findMany({
        where: { cancelled: true, deleted: false },
        include: { createdBy: true },
        orderBy: { date: "desc" }
      }))
    );
  }

  if (activeView === "deleted-events") {
    deletedEvents.push(
      ...(await prisma.event.findMany({
        where: { deleted: true },
        include: { createdBy: true },
        orderBy: { createdAt: "desc" }
      }))
    );
  }

  return {
    pendingEventCount,
    reviewedEventCount,
    pendingTicketCount,
    reviewedTicketCount,
    publishedEventCount,
    cancelledEventCount,
    deletedEventCount,
    events,
    reviewedEvents,
    tickets,
    reviewedTickets,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    supportsReviewHistory: supportsEventReviewHistory && supportsTicketReviewHistory
  };
}

interface RefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: Date;
  reviewedAt?: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    event: {
      id: string;
      name: string;
    };
  };
  adminComment?: string;
}

export default function AdminPage({
export default async function AdminPage({
  searchParams
}: {
  searchParams?: { view?: string };
}) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<Event[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<Event[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<Event[]>([]);
  const [reviewedEvents, setReviewedEvents] = useState<Event[]>([]);
  const [reviewedTickets, setReviewedTickets] = useState<Ticket[]>([]);
  const [reviewedRefunds, setReviewedRefunds] = useState<RefundRequest[]>([]);
  const { addToast } = useToast();
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundRequest[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const user = await getSessionUser();

  if (!user || user.role !== "admin") {
    return <p className="surface-card p-5 text-sm text-secondary">Admin access only.</p>;
  }

  const activeView: AdminView = VIEWS.some((v) => v.id === searchParams?.view)
    ? (searchParams?.view as AdminView)
    : "pending-events";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();

        if (!data.user || data.user.role !== "admin") {
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);
        await fetchData();
      } catch (error) {
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/data");
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setEvents(data.events);
      setTickets(data.tickets);
      setFilteredEvents(data.events);
      setFilteredTickets(data.tickets);
      setPublishedEvents(data.publishedEvents);
      setCancelledEvents(data.cancelledEvents);
      setDeletedEvents(data.deletedEvents);
      setReviewedEvents(data.reviewedEvents);
      setReviewedTickets(data.reviewedTickets);

      // Fetch refund requests
      const refundRes = await fetch("/api/admin/refunds");
      if (refundRes.ok) {
        const refundData = await refundRes.json();
        setRefunds(refundData.refunds || []);
        setFilteredRefunds(refundData.refunds || []);
      }

      // Build audit log from reviewed items
      const auditEntries: AuditLogEntry[] = [];
      data.reviewedEvents.forEach((event: Event) => {
        auditEntries.push({
          id: `event-${event.id}`,
          itemName: event.name,
          action: event.reviewStatus as "APPROVED" | "REJECTED" | "VIEWED",
          adminName: "Admin",
          timestamp: event.reviewedAt || new Date(),
          itemType: "event",
        });
      });
      data.reviewedTickets.forEach((ticket: Ticket) => {
        auditEntries.push({
          id: `ticket-${ticket.id}`,
          itemName: `${ticket.user.name} - ${ticket.event.name}`,
          action: ticket.reviewStatus as "APPROVED" | "REJECTED" | "VIEWED",
          adminName: "Admin",
          timestamp: ticket.reviewedAt || new Date(),
          itemType: "ticket",
        });
      });
      setAuditLog(auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      addToast("Failed to load admin data", "error");
    }
  };
  let data;
  try {
    data = await loadAdminData(activeView);
  } catch (error) {
    const details =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : null;

    return (
      <section className="surface-card border-rose-200 bg-rose-50 p-6">
        <h1 className="text-lg font-semibold text-rose-900">Could not connect to database</h1>
        <p className="mt-2 text-sm text-rose-800">
          Check your <code>DATABASE_URL</code> and ensure PostgreSQL is reachable.
        </p>
        {details ? (
          <p className="mt-2 break-all text-xs text-rose-700">
            <span className="font-semibold">Debug:</span> {details}
          </p>
        ) : null}
      </section>
    );
  }

  if (!isAuthorized) {
    return <p className="surface-card p-5 text-sm text-secondary">Admin access only.</p>;
  }

  const handleEventFilterChange = (filters: any) => {
    let filtered = [...events];
    
    if (filters.dateFrom) {
      filtered = filtered.filter(e => new Date(e.createdAt) >= filters.dateFrom);
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.createdAt) <= endOfDay);
    }
    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    
    setFilteredEvents(filtered);
  };

  const handleTicketFilterChange = (filters: any) => {
    let filtered = [...tickets];
    
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.createdAt) >= filters.dateFrom);
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.createdAt) <= endOfDay);
    }
    
    setFilteredTickets(filtered);
  };

  const eventCategories = [...new Set(events.map(e => e.category))];
  
  // Combine pending + reviewed items for comprehensive metrics
  const allEventsForMetrics = [...events, ...reviewedEvents];
  const allTicketsForMetrics = [...tickets, ...reviewedTickets];
  const {
    pendingEventCount,
    reviewedEventCount,
    pendingTicketCount,
    reviewedTicketCount,
    publishedEventCount,
    events,
    reviewedEvents,
    tickets,
    reviewedTickets,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    supportsReviewHistory
  } = data;

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

      {/* Approval Metrics */}
      <ApprovalMetrics events={allEventsForMetrics} tickets={allTicketsForMetrics} />

      <div className="grid gap-4 md:grid-cols-5">
        <div className="surface-card p-4 rounded-lg border border-slate-200">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{pendingEventCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Tickets</p>
          <p className="mt-2 text-2xl font-bold text-primary">{pendingTicketCount}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Refunds</p>
          <p className="mt-2 text-2xl font-bold text-primary">{refunds.length}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Published Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{publishedEventCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Reviewed Items</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {reviewedEvents.length + reviewedTickets.length + reviewedRefunds.length}
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">{reviewedEventCount + reviewedTicketCount}</p>
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
                        {"reviewStatus" in event ? String(event.reviewStatus) : "PENDING"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <AsyncForm action={`/api/admin/events/${event.id}/approve`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                      Approve Event
                    </button>
                  </AsyncForm>

                  <AsyncForm action={`/api/admin/events/${event.id}/reject`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
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
                  </AsyncForm>
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
                  <AsyncForm action={`/api/admin/tickets/${ticket.id}/approve`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                      Approve Ticket Slip
                    </button>
                  </AsyncForm>

                  <AsyncForm action={`/api/admin/tickets/${ticket.id}/reject`} method="post" className="space-y-2 rounded-xl border border-slate-200 p-3">
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
                  </AsyncForm>
                </div>
              </div>
            ))}
            {tickets.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No pending ticket approvals.</p> : null}
          </div>
        </div>
      )}

      {activeView === "pending-refunds" && (
        <div className="space-y-4">
          <h2 className="mb-4 text-xl font-semibold text-primary border-b pb-2">Pending Refund Requests ({filteredRefunds.length})</h2>
          <div className="space-y-3">
            {filteredRefunds.length > 0 ? (
              filteredRefunds.map((refund) => (
                <div key={refund.id} className="surface-card p-4 border border-slate-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-primary">{refund.user.name}</p>
                      <p className="text-sm text-secondary mt-1">📌 {refund.ticket.event.name}</p>
                      <p className="text-sm text-secondary">Reason: {refund.reason}</p>
                      <p className="font-semibold text-lg text-primary mt-2">Amount: ${parseFloat(String(refund.amount)).toFixed(2)}</p>
                      <p className="text-xs text-secondary mt-1">Requested: {new Date(refund.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <form
                        action={`/api/admin/refunds/${refund.id}/approve`}
                        method="POST"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          try {
                            const res = await fetch(`/api/admin/refunds/${refund.id}/approve`, {
                              method: "POST",
                              body: formData
                            });
                            if (res.ok) {
                              addToast("Refund approved successfully", "success");
                              setRefunds(refunds.filter(r => r.id !== refund.id));
                              setFilteredRefunds(filteredRefunds.filter(r => r.id !== refund.id));
                            } else {
                              addToast("Failed to approve refund", "error");
                            }
                          } catch (error) {
                            addToast("Error approving refund", "error");
                          }
                        }}
                        className="flex flex-col gap-2"
                      >
                        <input
                          type="hidden"
                          name="adminComment"
                          value="Approved by admin"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                        >
                          ✓ Approve
                        </button>
                      </form>
                      <button
                        onClick={() => {
                          const comment = prompt("Enter rejection reason:");
                          if (comment) {
                            const form = new FormData();
                            form.append("adminComment", comment);
                            fetch(`/api/admin/refunds/${refund.id}/reject`, {
                              method: "POST",
                              body: form
                            })
                              .then(res => {
                                if (res.ok) {
                                  addToast("Refund rejected successfully", "success");
                                  setRefunds(refunds.filter(r => r.id !== refund.id));
                                  setFilteredRefunds(filteredRefunds.filter(r => r.id !== refund.id));
                                } else {
                                  addToast("Failed to reject refund", "error");
                                }
                              })
                              .catch(() => addToast("Error rejecting refund", "error"));
                          }
                        }}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-card p-4 text-sm text-secondary text-center rounded-lg">
                No pending refund requests
              </div>
            )}
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
                  <p className="text-secondary">Status: {String(event.reviewStatus)}</p>
                  <p className="text-secondary">Comment: {event.adminComment || "N/A"}</p>
                  <p className="text-secondary">
                    Reviewed At: {event.reviewedAt ? new Date(event.reviewedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
              ))}
              {reviewedEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No reviewed events yet.</p> : null}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed Tickets</h2>
            <div className="space-y-3">
              {reviewedTickets.map((ticket) => (
                <div key={ticket.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">{ticket.user.name} • {ticket.event.name}</p>
                  <p className="text-secondary">Status: {String(ticket.reviewStatus)}</p>
                  <p className="text-secondary">Comment: {ticket.adminComment || "N/A"}</p>
                  <p className="text-secondary">
                    Reviewed At: {ticket.reviewedAt ? new Date(ticket.reviewedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
              ))}
              {reviewedTickets.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No reviewed tickets yet.</p> : null}
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
            {publishedEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No published events.</p> : null}
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
            {cancelledEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No cancelled events.</p> : null}
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
            {deletedEvents.length === 0 ? <p className="surface-card p-4 text-sm text-secondary">No deleted events.</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}
