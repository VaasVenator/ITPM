import Link from "next/link";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { AsyncForm } from "@/components/ui/async-form";
import { ApprovalMetrics } from "@/components/approval-metrics";
import { ApprovalFilterSection } from "@/components/approval-filter-section";

type AdminView =
  | "pending-approvals"
  | "pending-events"
  | "published-events"
  | "cancelled-events"
  | "deleted-events"
  | "pending-tickets"
  | "pending-refunds"
  | "review-history";

type ApprovalMetricStats = {
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number;
  averageReviewTime: number;
  eventApprovals: number;
  ticketApprovals: number;
  totalItems: number;
  totalEventItems: number;
  totalTicketItems: number;
};

type RefundRequest = {
  id: string;
  amount: number | string;
  reason: string;
  status: string;
  createdAt: Date;
  reviewedAt?: Date | null;
  adminComment?: string | null;
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
};

const VIEWS: Array<{ id: AdminView; label: string }> = [
  { id: "pending-approvals", label: "All Pending Approvals" },
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
  let supportsRefunds = true;

  let pendingEventCount = 0;
  let pendingTicketCount = 0;

  let metricStats: ApprovalMetricStats = {
    totalApproved: 0,
    totalRejected: 0,
    totalPending: 0,
    approvalRate: 0,
    averageReviewTime: 0,
    eventApprovals: 0,
    ticketApprovals: 0,
    totalItems: 0,
    totalEventItems: 0,
    totalTicketItems: 0
  };

  const events: any[] = [];
  const reviewedEvents: any[] = [];
  const tickets: any[] = [];
  const reviewedTickets: any[] = [];
  const refunds: RefundRequest[] = [];
  const reviewedRefunds: RefundRequest[] = [];
  const publishedEvents: any[] = [];
  const cancelledEvents: any[] = [];
  const deletedEvents: any[] = [];

  let totalEventItems = 0;
  let totalTicketItems = 0;
  let eventApprovals = 0;
  let ticketApprovals = 0;
  let totalRejected = 0;
  let reviewPairs: Array<{ createdAt: Date; reviewedAt: Date | null }> = [];

  try {
    const [
      eventTotalCount,
      approvedEventCount,
      rejectedEventCount,
      eventReviewPairs
    ] = await Promise.all([
      prisma.event.count({ where: { deleted: false } }),
      prisma.event.count({
        where: { deleted: false, reviewStatus: "APPROVED" } as any
      }),
      prisma.event.count({
        where: { deleted: false, reviewStatus: "REJECTED" } as any
      }),
      prisma.event.findMany({
        where: {
          deleted: false,
          reviewStatus: { not: "PENDING" }
        } as any,
        select: { createdAt: true, reviewedAt: true } as any
      })
    ]);

    totalEventItems = eventTotalCount;
    eventApprovals = approvedEventCount;
    pendingEventCount = Math.max(0, eventTotalCount - approvedEventCount - rejectedEventCount);
    totalRejected += rejectedEventCount;
    reviewPairs = reviewPairs.concat(
      eventReviewPairs as unknown as Array<{ createdAt: Date; reviewedAt: Date | null }>
    );

    if (activeView === "pending-events" || activeView === "pending-approvals") {
      events.push(
        ...(await prisma.event.findMany({
          where: { deleted: false, reviewStatus: "PENDING" } as any,
          include: { createdBy: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

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
    const [legacyEventTotalCount, legacyApprovedEventCount] = await Promise.all([
      prisma.event.count({ where: { deleted: false } }),
      prisma.event.count({ where: { deleted: false, approved: true } })
    ]);

    totalEventItems = legacyEventTotalCount;
    eventApprovals = legacyApprovedEventCount;
    pendingEventCount = Math.max(0, legacyEventTotalCount - legacyApprovedEventCount);

    if (activeView === "pending-events" || activeView === "pending-approvals") {
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
    const [
      ticketTotalCount,
      approvedTicketCount,
      rejectedTicketCount,
      ticketReviewPairs
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({
        where: { reviewStatus: "APPROVED" } as any
      }),
      prisma.ticket.count({
        where: { reviewStatus: "REJECTED" } as any
      }),
      prisma.ticket.findMany({
        where: {
          reviewStatus: { not: "PENDING" }
        } as any,
        select: { createdAt: true, reviewedAt: true } as any
      })
    ]);

    totalTicketItems = ticketTotalCount;
    ticketApprovals = approvedTicketCount;
    pendingTicketCount = Math.max(0, ticketTotalCount - approvedTicketCount - rejectedTicketCount);
    totalRejected += rejectedTicketCount;
    reviewPairs = reviewPairs.concat(
      ticketReviewPairs as unknown as Array<{ createdAt: Date; reviewedAt: Date | null }>
    );

    if (activeView === "pending-tickets" || activeView === "pending-approvals") {
      tickets.push(
        ...(await prisma.ticket.findMany({
          where: { reviewStatus: "PENDING" } as any,
          include: { event: true, user: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

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
    const [legacyTicketTotalCount, legacyApprovedTicketCount] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { approved: true } })
    ]);

    totalTicketItems = legacyTicketTotalCount;
    ticketApprovals = legacyApprovedTicketCount;
    pendingTicketCount = Math.max(0, legacyTicketTotalCount - legacyApprovedTicketCount);

    if (activeView === "pending-tickets" || activeView === "pending-approvals") {
      tickets.push(
        ...(await prisma.ticket.findMany({
          where: { approved: false },
          include: { event: true, user: true },
          orderBy: { createdAt: "desc" }
        }))
      );
    }
  }

  const totalApproved = eventApprovals + ticketApprovals;
  const totalPending = pendingEventCount + pendingTicketCount;
  const totalItems = totalEventItems + totalTicketItems;

  const completedReviewPairs = reviewPairs.filter(
    (item): item is { createdAt: Date; reviewedAt: Date } => Boolean(item.reviewedAt)
  );

  const averageReviewTime =
    completedReviewPairs.length === 0
      ? 0
      : Math.round(
          completedReviewPairs.reduce((sum, item) => {
            return sum + (item.reviewedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60);
          }, 0) / completedReviewPairs.length
        );

  metricStats = {
    totalApproved,
    totalRejected,
    totalPending,
    approvalRate: totalItems > 0 ? Math.round((totalApproved / totalItems) * 100) : 0,
    averageReviewTime,
    eventApprovals,
    ticketApprovals,
    totalItems,
    totalEventItems,
    totalTicketItems
  };

  const refundRequestModel = (prisma as any).refundRequest;
  if (!refundRequestModel) {
    supportsRefunds = false;
  } else {
    if (activeView === "pending-refunds") {
      refunds.push(
        ...(await refundRequestModel.findMany({
          where: { status: "PENDING" },
          include: { user: true, ticket: { include: { event: true } } },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    if (activeView === "review-history") {
      reviewedRefunds.push(
        ...(await refundRequestModel.findMany({
          where: { status: { not: "PENDING" } },
          include: { user: true, ticket: { include: { event: true } } },
          orderBy: { reviewedAt: "desc" }
        }))
      );
    }
  }

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
    events,
    reviewedEvents,
    tickets,
    reviewedTickets,
    refunds,
    reviewedRefunds,
    metricStats,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    supportsRefunds,
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
    : "pending-approvals";

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

  const {
    events,
    reviewedEvents,
    tickets,
    reviewedTickets,
    refunds,
    reviewedRefunds,
    metricStats,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    supportsRefunds,
    supportsReviewHistory
  } = data;

  const plainTickets = tickets.map((ticket) => ({
    ...ticket,
    price: Number(ticket.price),
    reviewedAt: ticket.reviewedAt ? new Date(ticket.reviewedAt).toISOString() : null,
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : null,
    event: ticket.event
      ? {
          ...ticket.event,
          date: ticket.event.date ? new Date(ticket.event.date).toISOString() : null,
          createdAt: ticket.event.createdAt ? new Date(ticket.event.createdAt).toISOString() : null
        }
      : ticket.event,
    user: ticket.user
      ? {
          ...ticket.user,
          createdAt: ticket.user.createdAt ? new Date(ticket.user.createdAt).toISOString() : null
        }
      : ticket.user
  }));

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

      <ApprovalMetrics stats={metricStats} />

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

      {activeView === "pending-approvals" && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-primary">All Pending Approvals</h2>
          <ApprovalFilterSection events={events} tickets={plainTickets} />
        </div>
      )}

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
                    <p className="mt-2 text-secondary">
                      Description: {event.description || "No description provided"}
                    </p>
                    <p className="mt-2 text-secondary">Ticket Required: {event.ticketRequired ? "Yes" : "No"}</p>
                    <p className="text-secondary">Submitted At: {new Date(event.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-highlight/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Requested By</p>
                    <p className="mt-2 text-sm font-semibold text-primary">{event.createdBy.name}</p>
                    <p className="mt-1 break-all text-xs text-secondary">{event.createdBy.email}</p>
                    <p className="mt-2 text-xs text-secondary">
                      Current Review Status:{" "}
                      <span className="font-semibold text-primary">
                        {"reviewStatus" in event ? String(event.reviewStatus) : "PENDING"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <AsyncForm
                    action={`/api/admin/events/${event.id}/approve`}
                    method="post"
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                      Approve
                    </button>
                  </AsyncForm>

                  <AsyncForm
                    action={`/api/admin/events/${event.id}/reject`}
                    method="post"
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Reason is required"
                      required
                    />
                    <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                      Reject
                    </button>
                  </AsyncForm>
                </div>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="surface-card p-4 text-sm text-secondary">No pending events.</p>
            ) : null}
          </div>
        </div>
      )}

      {activeView === "pending-tickets" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Ticket Slips</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="surface-card p-4 text-sm">
                <p className="font-semibold text-primary">
                  {ticket.user.name} • {ticket.event.name}
                </p>
                <p className="mt-1 text-secondary">Quantity: {parseTicketQuantity(ticket.notes)}</p>
                <p className="text-secondary">Amount per ticket: LKR {Number(ticket.price).toFixed(2)}</p>
                <p className="text-secondary">
                  Total amount: LKR {(Number(ticket.price) * parseTicketQuantity(ticket.notes)).toFixed(2)}
                </p>

                {ticket.paymentSlip.startsWith("data:image/") ? (
                  <img
                    src={ticket.paymentSlip}
                    alt={`Bank slip for ${ticket.user.name}`}
                    className="mt-2 h-56 w-full rounded-xl border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <p className="mt-1 break-all text-secondary">Slip: {ticket.paymentSlip}</p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <AsyncForm
                    action={`/api/admin/tickets/${ticket.id}/approve`}
                    method="post"
                    redirectTo="/admin?view=pending-tickets"
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Optional approval note"
                    />
                    <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                      Approve
                    </button>
                  </AsyncForm>

                  <AsyncForm
                    action={`/api/admin/tickets/${ticket.id}/reject`}
                    method="post"
                    redirectTo="/admin?view=pending-tickets"
                    className="space-y-2 rounded-xl border border-slate-200 p-3"
                  >
                    <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                    <textarea
                      name="adminComment"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 p-2"
                      placeholder="Reason is required"
                      required
                    />
                    <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                      Reject
                    </button>
                  </AsyncForm>
                </div>
              </div>
            ))}
            {tickets.length === 0 ? (
              <p className="surface-card p-4 text-sm text-secondary">No pending ticket slips.</p>
            ) : null}
          </div>
        </div>
      )}

      {activeView === "pending-refunds" && (
        <div className="space-y-4">
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Refund Requests</h2>
          {!supportsRefunds ? (
            <p className="surface-card p-4 text-sm text-secondary">
              Refund requests are not available in this database yet.
            </p>
          ) : (
            <div className="space-y-3">
              {refunds.length > 0 ? (
                refunds.map((refund) => (
                  <div key={refund.id} className="surface-card rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-primary">{refund.user.name}</p>
                        <p className="mt-1 text-secondary">Event: {refund.ticket.event.name}</p>
                        <p className="text-secondary">Reason: {refund.reason}</p>
                        <p className="mt-2 text-lg font-semibold text-primary">
                          Refund Amount: LKR {Number(refund.amount).toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          Requested: {new Date(refund.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="grid gap-3 md:w-[28rem] md:grid-cols-2">
                        <AsyncForm
                          action={`/api/admin/refunds/${refund.id}/approve`}
                          method="post"
                          redirectTo="/admin?view=pending-refunds"
                          className="space-y-2 rounded-xl border border-slate-200 p-3"
                        >
                          <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                          <textarea
                            name="adminComment"
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 p-2"
                            placeholder="Optional approval note"
                          />
                          <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                            Approve
                          </button>
                        </AsyncForm>

                        <AsyncForm
                          action={`/api/admin/refunds/${refund.id}/reject`}
                          method="post"
                          redirectTo="/admin?view=pending-refunds"
                          className="space-y-2 rounded-xl border border-slate-200 p-3"
                        >
                          <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                          <textarea
                            name="adminComment"
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 p-2"
                            placeholder="Reason is required"
                            required
                          />
                          <button
                            className="rounded-lg px-3 py-2 font-semibold text-white transition hover:bg-red-700"
                            style={{ backgroundColor: "var(--delete)" }}
                          >
                            Reject
                          </button>
                        </AsyncForm>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="surface-card rounded-lg p-4 text-center text-sm text-secondary">
                  No pending refund requests.
                </div>
              )}
            </div>
          )}
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
                  <p className="text-secondary">
                    Admin Comment: {event.adminComment || "No comment provided"}
                  </p>
                  <p className="text-secondary">
                    Reviewed At:{" "}
                    {event.reviewedAt
                      ? new Date(event.reviewedAt).toLocaleString()
                      : "Not reviewed yet"}
                  </p>
                </div>
              ))}
              {reviewedEvents.length === 0 ? (
                <p className="surface-card p-4 text-sm text-secondary">No reviewed events yet.</p>
              ) : null}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed Tickets</h2>
            <div className="space-y-3">
              {reviewedTickets.map((ticket) => (
                <div key={ticket.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">
                    {ticket.user.name} • {ticket.event.name}
                  </p>
                  <p className="text-secondary">Status: {String(ticket.reviewStatus)}</p>
                  <p className="text-secondary">
                    Admin Comment: {ticket.adminComment || "No comment provided"}
                  </p>
                  <p className="text-secondary">
                    Reviewed At:{" "}
                    {ticket.reviewedAt
                      ? new Date(ticket.reviewedAt).toLocaleString()
                      : "Not reviewed yet"}
                  </p>
                </div>
              ))}
              {reviewedTickets.length === 0 ? (
                <p className="surface-card p-4 text-sm text-secondary">No reviewed tickets yet.</p>
              ) : null}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed Refunds</h2>
            {!supportsRefunds ? (
              <p className="surface-card p-4 text-sm text-secondary">
                Refund review history is not available in this database yet.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewedRefunds.map((refund) => (
                  <div key={refund.id} className="surface-card p-4 text-sm">
                    <p className="font-semibold text-primary">
                      {refund.user.name} • {refund.ticket.event.name}
                    </p>
                    <p className="text-secondary">Status: {refund.status}</p>
                    <p className="text-secondary">
                      Admin Comment: {refund.adminComment || "No comment provided"}
                    </p>
                    <p className="text-secondary">
                      Reviewed At:{" "}
                      {refund.reviewedAt
                        ? new Date(refund.reviewedAt).toLocaleString()
                        : "Not reviewed yet"}
                    </p>
                  </div>
                ))}
                {reviewedRefunds.length === 0 ? (
                  <p className="surface-card p-4 text-sm text-secondary">No reviewed refunds yet.</p>
                ) : null}
              </div>
            )}
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
                <p className="mt-1 text-secondary">
                  {new Date(event.date).toLocaleString()} • {event.location}
                </p>
              </div>
            ))}
            {publishedEvents.length === 0 ? (
              <p className="surface-card p-4 text-sm text-secondary">No published events.</p>
            ) : null}
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
                <p className="mt-1 text-secondary">
                  {new Date(event.date).toLocaleString()} • {event.location}
                </p>
              </div>
            ))}
            {cancelledEvents.length === 0 ? (
              <p className="surface-card p-4 text-sm text-secondary">No cancelled events.</p>
            ) : null}
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
            {deletedEvents.length === 0 ? (
              <p className="surface-card p-4 text-sm text-secondary">No deleted events.</p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}