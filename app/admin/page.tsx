import Link from "next/link";
import { getSessionUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { AsyncForm } from "@/components/ui/async-form";
import { ApprovalMetrics } from "@/components/approval-metrics";
import { ApprovalFilterSection } from "@/components/approval-filter-section";
import ReviewReports from "@/components/admin/review-reports";
import type { ReviewReportRow } from "@/components/admin/review-reports";

type AdminView =
  | "pending-approvals"
  | "pending-reviews"
  | "pending-events"
  | "published-events"
  | "cancelled-events"
  | "deleted-events"
  | "pending-tickets"
  | "pending-refunds"
  | "review-history"
  | "review-analytics"
  | "pending-reviews";

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

type ReviewAnalyticsRow = ReviewReportRow;

const VIEWS: Array<{ id: AdminView; label: string }> = [
  { id: "pending-approvals", label: "All Pending Approvals" },
  { id: "pending-reviews", label: "Pending Reviews" },
  { id: "pending-events", label: "Pending Event Approvals" },
  { id: "published-events", label: "Published Events" },
  { id: "cancelled-events", label: "Cancelled Events" },
  { id: "deleted-events", label: "Deleted Events" },
  { id: "pending-tickets", label: "Pending Ticket Slips" },
  { id: "pending-refunds", label: "Pending Refunds" },
  { id: "pending-reviews", label: "Pending Reviews" },
  { id: "review-history", label: "Review History" },
  { id: "review-analytics", label: "Review Analytics" }
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
  let supportsUserReviews = true;
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
  const pendingReviews: any[] = [];
  const reviewedEvents: any[] = [];
  const reviewedUserReviews: any[] = [];
  const tickets: any[] = [];
  const reviewedTickets: any[] = [];
  const refunds: RefundRequest[] = [];
  const reviewedRefunds: RefundRequest[] = [];
  const publishedEvents: any[] = [];
  const cancelledEvents: any[] = [];
  const deletedEvents: any[] = [];
  const eventReviews: ReviewReportRow[] = [];
  const pendingReviews: any[] = [];

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
    ] = await prisma.$transaction([
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
          select: {
            id: true,
            name: true,
            category: true,
            date: true,
            location: true,
            description: true,
            eventImage: true,
            ticketRequired: true,
            createdAt: true,
            reviewStatus: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    if (activeView === "review-history") {
      reviewedEvents.push(
        ...(await prisma.event.findMany({
          where: { reviewStatus: { not: "PENDING" } } as any,
          select: {
            id: true,
            name: true,
            reviewStatus: true,
            adminComment: true,
            reviewedAt: true,
            createdBy: {
              select: {
                name: true
              }
            }
          },
          orderBy: { reviewedAt: "desc" } as any
        }))
      );
    }

    if (activeView === "pending-reviews" || activeView === "pending-approvals") {
      const eventReviewModel = (prisma as any).eventReview;
      if (eventReviewModel) {
        pendingReviews.push(
          ...((await eventReviewModel.findMany({
            where: { moderationStatus: "PENDING" },
            select: {
              id: true,
              rating: true,
              comment: true,
              anonymous: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              },
              event: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          })) as Array<{
            id: string;
            rating: number;
            comment: string;
            anonymous: boolean;
            createdAt: Date;
            user: { id: string; name: string };
            event: { id: string; name: string; category: string };
          }>)
        );
      } else {
        supportsUserReviews = false;
      }
    }

    if (activeView === "review-history") {
      const eventReviewModel = (prisma as any).eventReview;
      if (eventReviewModel) {
        reviewedUserReviews.push(
          ...((await eventReviewModel.findMany({
            where: { moderationStatus: { not: "PENDING" } },
            select: {
              id: true,
              rating: true,
              comment: true,
              anonymous: true,
              moderationStatus: true,
              adminComment: true,
              moderatedAt: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              },
              event: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { moderatedAt: "desc" }
          })) as Array<{
            id: string;
            rating: number;
            comment: string;
            anonymous: boolean;
            moderationStatus: string;
            adminComment: string | null;
            moderatedAt: Date | null;
            createdAt: Date;
            user: { id: string; name: string };
            event: { id: string; name: string };
          }>)
        );
      } else {
        supportsUserReviews = false;
      }
    }

    if (activeView === "review-analytics") {
      const eventReviewModel = (prisma as any).eventReview;
      if (eventReviewModel) {
        reviewAnalytics.push(
          ...((await eventReviewModel.findMany({
            select: {
              id: true,
              eventId: true,
              rating: true,
              comment: true,
              anonymous: true,
              moderationStatus: true,
              adminComment: true,
              createdAt: true,
              moderatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              },
              event: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          })) as Array<{
            id: string;
            eventId: string;
            rating: number;
            comment: string;
            anonymous: boolean;
            moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
            adminComment: string | null;
            createdAt: Date;
            moderatedAt: Date | null;
            user: { id: string; name: string };
            event: { id: string; name: string; category: ReviewReportRow["eventCategory"] };
          }>).map((review) => ({
            id: review.id,
            eventId: review.eventId,
            eventName: review.event.name,
            eventCategory: review.event.category,
            userName: review.user.name,
            userId: review.user.id,
            rating: review.rating,
            comment: review.comment,
            anonymous: review.anonymous,
            moderationStatus: review.moderationStatus,
            adminComment: review.adminComment,
            createdAt: review.createdAt.toISOString(),
            moderatedAt: review.moderatedAt ? review.moderatedAt.toISOString() : null
          }))
        );
      } else {
        supportsUserReviews = false;
      }
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
          select: {
            id: true,
            name: true,
            category: true,
            date: true,
            location: true,
            description: true,
            eventImage: true,
            ticketRequired: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
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
    ] = await prisma.$transaction([
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
          select: {
            id: true,
            price: true,
            paymentSlip: true,
            notes: true,
            createdAt: true,
            reviewStatus: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    if (activeView === "review-history") {
      reviewedTickets.push(
        ...(await prisma.ticket.findMany({
          where: { reviewStatus: { not: "PENDING" } } as any,
          select: {
            id: true,
            reviewStatus: true,
            adminComment: true,
            reviewedAt: true,
            user: {
              select: {
                name: true
              }
            },
            event: {
              select: {
                name: true
              }
            }
          },
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
          select: {
            id: true,
            price: true,
            paymentSlip: true,
            notes: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                name: true
              }
            }
          },
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
          select: {
            id: true,
            amount: true,
            reason: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            ticket: {
              select: {
                id: true,
                event: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }))
      );
    }

    if (activeView === "review-history") {
      reviewedRefunds.push(
        ...(await refundRequestModel.findMany({
          where: { status: { not: "PENDING" } },
          select: {
            id: true,
            amount: true,
            reason: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
            adminComment: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            ticket: {
              select: {
                id: true,
                event: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { reviewedAt: "desc" }
        }))
      );
    }
  }

  if (activeView === "published-events") {
    publishedEvents.push(
      ...(await prisma.event.findMany({
        where: { approved: true, published: true, deleted: false },
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { date: "asc" }
      }))
    );
  }

  if (activeView === "cancelled-events") {
    cancelledEvents.push(
      ...(await prisma.event.findMany({
        where: { cancelled: true, deleted: false },
        select: {
          id: true,
          name: true,
          date: true,
          location: true,
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { date: "desc" }
      }))
    );
  }

  if (activeView === "deleted-events") {
    deletedEvents.push(
      ...(await prisma.event.findMany({
        where: { deleted: true },
        select: {
          id: true,
          name: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }))
    );
  }

  if (activeView === "review-analytics") {
    try {
      const eventReviewModel = (prisma as any).eventReview;
      if (eventReviewModel) {
        const reviews = await eventReviewModel.findMany({
          include: {
            event: {
              select: {
                id: true,
                name: true,
                category: true
              }
            },
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        });

        eventReviews.push(
          ...reviews.map((review: any) => ({
            id: review.id,
            eventId: review.eventId,
            eventName: review.event?.name || "Unknown Event",
            eventCategory: review.event?.category || "WORKSHOPS",
            userId: review.userId,
            userName: review.user?.name || "Anonymous",
            rating: review.rating || 0,
            comment: review.comment || "",
            anonymous: review.anonymous || false,
            moderationStatus: review.moderationStatus || "PENDING",
            adminComment: review.adminComment || null,
            createdAt: review.createdAt?.toISOString() || new Date().toISOString(),
            moderatedAt: review.moderatedAt?.toISOString() || null
          }))
        );
      }
    } catch (error) {
      // EventReview model might not exist in older schemas
      console.error("Error fetching event reviews:", error);
    }
  }

  if (activeView === "pending-reviews") {
    try {
      const eventReviewModel = (prisma as any).eventReview;
      if (eventReviewModel) {
        pendingReviews.push(
          ...(await eventReviewModel.findMany({
            where: { moderationStatus: "PENDING" },
            include: {
              event: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          }))
        );
      }
    } catch (error) {
      // EventReview model might not exist in older schemas
      console.error("Error fetching pending reviews:", error);
    }
  }

  return {
    events,
    pendingReviews,
    reviewedEvents,
    reviewedUserReviews,
    tickets,
    reviewedTickets,
    refunds,
    reviewedRefunds,
    reviewAnalytics,
    metricStats,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    eventReviews,
    pendingReviews,
    supportsRefunds,
    supportsReviewHistory: supportsEventReviewHistory && supportsTicketReviewHistory,
    supportsUserReviews
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
    pendingReviews,
    reviewedEvents,
    reviewedUserReviews,
    tickets,
    reviewedTickets,
    refunds,
    reviewedRefunds,
    reviewAnalytics,
    metricStats,
    publishedEvents,
    cancelledEvents,
    deletedEvents,
    eventReviews,
    pendingReviews,
    supportsRefunds,
    supportsReviewHistory,
    supportsUserReviews
  } = data;

  const plainTickets = tickets.map((ticket) => ({
    ...ticket,
    price: Number(ticket.price)
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

          {pendingReviews.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold text-primary">Pending Review Moderation</h3>
              {pendingReviews.map((review) => (
                <div key={review.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">
                    {review.event.name} • {review.anonymous ? "Anonymous" : review.user.name}
                  </p>
                  <p className="mt-1 text-secondary">Category: {review.event.category}</p>
                  <p className="text-secondary">Rating: {review.rating}/5</p>
                  <p className="text-secondary">Submitted: {new Date(review.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-secondary">{review.comment}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <AsyncForm action={`/api/admin/reviews/${review.id}/approve`} method="post" redirectTo="/admin?view=pending-reviews" className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                      <textarea name="adminComment" rows={3} className="w-full rounded-lg border border-slate-300 p-2" placeholder="Optional approval note" />
                      <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                        Approve Review
                      </button>
                    </AsyncForm>

                    <AsyncForm action={`/api/admin/reviews/${review.id}/reject`} method="post" redirectTo="/admin?view=pending-reviews" className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                      <textarea name="adminComment" rows={3} className="w-full rounded-lg border border-slate-300 p-2" placeholder="Reason is required" required />
                      <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                        Reject Review
                      </button>
                    </AsyncForm>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {activeView === "pending-reviews" && (
        <div>
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Reviews</h2>
          {!supportsUserReviews ? (
            <p className="surface-card p-4 text-sm text-secondary">
              Pending reviews are not available yet because this database is still missing the review schema.
            </p>
          ) : pendingReviews.length === 0 ? (
            <p className="surface-card p-4 text-sm text-secondary">No pending reviews.</p>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map((review) => (
                <div key={review.id} className="surface-card p-4 text-sm">
                  <p className="font-semibold text-primary">
                    {review.event.name} • {review.anonymous ? "Anonymous" : review.user.name}
                  </p>
                  <p className="mt-1 text-secondary">Category: {review.event.category}</p>
                  <p className="text-secondary">Rating: {review.rating}/5</p>
                  <p className="text-secondary">Submitted: {new Date(review.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-secondary">{review.comment}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <AsyncForm action={`/api/admin/reviews/${review.id}/approve`} method="post" redirectTo="/admin?view=pending-reviews" className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                      <textarea name="adminComment" rows={3} className="w-full rounded-lg border border-slate-300 p-2" placeholder="Optional approval note" />
                      <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                        Approve Review
                      </button>
                    </AsyncForm>

                    <AsyncForm action={`/api/admin/reviews/${review.id}/reject`} method="post" redirectTo="/admin?view=pending-reviews" className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                      <textarea name="adminComment" rows={3} className="w-full rounded-lg border border-slate-300 p-2" placeholder="Reason is required" required />
                      <button className="rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800">
                        Reject Review
                      </button>
                    </AsyncForm>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {activeView === "pending-reviews" && (
        <div className="space-y-4">
          <h2 className="mb-3 text-xl font-semibold text-primary">Pending Event Reviews</h2>
          <div className="space-y-3">
            {pendingReviews.length > 0 ? (
              pendingReviews.map((review) => (
                <div key={review.id} className="surface-card rounded-lg border border-slate-200 p-4 text-sm">
                  <div className="mb-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-primary">{review.event.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          ⭐ {review.rating}/5
                        </span>
                      </div>
                    </div>
                    <p className="text-secondary">Reviewer: {review.user.name} ({review.user.email})</p>
                    {!review.anonymous && (
                      <p className="text-xs text-slate-500">Category: {review.event.category}</p>
                    )}
                  </div>

                  <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-secondary">{review.comment || "No comment provided"}</p>
                  </div>

                  <p className="mb-3 text-xs text-slate-500">
                    Submitted: {new Date(review.createdAt).toLocaleString()}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <AsyncForm
                      action={`/api/admin/reviews/${review.id}/approve`}
                      method="post"
                      redirectTo="/admin?view=pending-reviews"
                      className="space-y-2 rounded-xl border border-slate-200 p-3"
                    >
                      <label className="block text-xs font-semibold text-secondary">Approval Comment</label>
                      <textarea
                        name="adminComment"
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                        placeholder="Optional approval note"
                      />
                      <button className="rounded-lg bg-accent px-3 py-2 font-semibold text-white transition hover:bg-emerald-600">
                        Approve Review
                      </button>
                    </AsyncForm>

                    <AsyncForm
                      action={`/api/admin/reviews/${review.id}/reject`}
                      method="post"
                      redirectTo="/admin?view=pending-reviews"
                      className="space-y-2 rounded-xl border border-slate-200 p-3"
                    >
                      <label className="block text-xs font-semibold text-secondary">Rejection Reason</label>
                      <textarea
                        name="adminComment"
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                        placeholder="Reason is required"
                        required
                      />
                      <button
                        className="rounded-lg px-3 py-2 font-semibold text-white transition hover:bg-red-700"
                        style={{ backgroundColor: "var(--delete)" }}
                      >
                        Reject Review
                      </button>
                    </AsyncForm>
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-card rounded-lg p-4 text-center text-sm text-secondary">
                No pending reviews for moderation.
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

          <div>
            <h2 className="mb-3 text-xl font-semibold text-primary">Reviewed User Reviews</h2>
            {!supportsUserReviews ? (
              <p className="surface-card p-4 text-sm text-secondary">
                Reviewed user reviews are not available yet because this database is still missing the review schema.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewedUserReviews.map((review) => (
                  <div key={review.id} className="surface-card p-4 text-sm">
                    <p className="font-semibold text-primary">
                      {review.event.name} • {review.anonymous ? "Anonymous" : review.user.name}
                    </p>
                    <p className="text-secondary">Status: {review.moderationStatus}</p>
                    <p className="text-secondary">Rating: {review.rating}/5</p>
                    <p className="text-secondary">Submitted: {new Date(review.createdAt).toLocaleString()}</p>
                    <p className="mt-2 text-secondary">{review.comment}</p>
                    <p className="mt-2 text-secondary">
                      Admin Comment: {review.adminComment || "No comment provided"}
                    </p>
                    <p className="text-secondary">
                      Moderated At: {review.moderatedAt ? new Date(review.moderatedAt).toLocaleString() : "Not moderated yet"}
                    </p>
                  </div>
                ))}
                {reviewedUserReviews.length === 0 ? (
                  <p className="surface-card p-4 text-sm text-secondary">No reviewed user reviews yet.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "review-analytics" && (
        supportsUserReviews ? (
          <ReviewReports reviews={reviewAnalytics} />
        ) : (
          <p className="surface-card p-4 text-sm text-secondary">
            Review analytics are not available yet because this database is still missing the review schema.
          </p>
        )
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

      {activeView === "review-analytics" && (
        <div>
          <ReviewReports reviews={eventReviews} />
        </div>
      )}
    </section>
  );
}
