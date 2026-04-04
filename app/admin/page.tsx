"use client";

import { useEffect, useState } from "react";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { AdminApprovalSection } from "@/components/admin-approval-section";
import { useToast } from "@/components/toast";
import { ApprovalMetrics } from "@/components/approval-metrics";
import { AdvancedFilters } from "@/components/advanced-filters";
import { AuditLog, AuditLogEntry } from "@/components/audit-log";

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

function parseTicketQuantity(notes: string | null | undefined): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

interface Event {
  id: string;
  name: string;
  description?: string;
  category: string;
  location: string;
  date: Date;
  eventImage?: string;
  ticketRequired: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  reviewStatus: string;
  adminComment?: string;
  reviewedAt?: Date;
}

interface Ticket {
  id: string;
  price: number;
  paymentSlip: string;
  notes?: string;
  createdAt: Date;
  reviewStatus: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
  };
  adminComment?: string;
  reviewedAt?: Date;
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

  if (isLoading) {
    return (
      <section className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
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

  return (
    <section className="space-y-8">
      <h1 className="page-title">Admin Dashboard</h1>

      {/* Approval Metrics */}
      <ApprovalMetrics events={allEventsForMetrics} tickets={allTicketsForMetrics} />

      <div className="grid gap-4 md:grid-cols-5">
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{events.length}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Tickets</p>
          <p className="mt-2 text-2xl font-bold text-primary">{tickets.length}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Pending Refunds</p>
          <p className="mt-2 text-2xl font-bold text-primary">{refunds.length}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Published Events</p>
          <p className="mt-2 text-2xl font-bold text-primary">{publishedEvents.length}</p>
        </div>
        <div className="surface-card p-4 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold uppercase text-secondary">Reviewed Items</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {reviewedEvents.length + reviewedTickets.length + reviewedRefunds.length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200">
        {VIEWS.map((view) => (
          <Link
            key={view.id}
            href={`/admin?view=${view.id}`}
            className={
              activeView === view.id
                ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition"
                : "rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-200"
            }
          >
            {view.label}
          </Link>
        ))}
      </div>

      {activeView === "pending-events" && (
        <div className="space-y-4">
          <AdvancedFilters
            onFilterChange={handleEventFilterChange}
            categories={eventCategories}
            hasDateRange={true}
          />
          <AdminApprovalSection
            type="events"
            title="Pending Event Approvals"
            items={filteredEvents}
            emptyMessage={filteredEvents.length === 0 && events.length > 0 ? "No events match your filters" : "No pending events to review"}
            onItemsChange={(items) => {
              setFilteredEvents(items as Event[]);
              setEvents(items as Event[]);
            }}
          />
        </div>
      )}

      {activeView === "pending-tickets" && (
        <div className="space-y-4">
          <AdvancedFilters
            onFilterChange={handleTicketFilterChange}
            hasDateRange={true}
          />
          <AdminApprovalSection
            type="tickets"
            title="Pending Ticket Slips"
            items={filteredTickets}
            emptyMessage={filteredTickets.length === 0 && tickets.length > 0 ? "No tickets match your filters" : "No pending ticket approvals"}
            onItemsChange={(items) => {
              setFilteredTickets(items as Ticket[]);
              setTickets(items as Ticket[]);
            }}
          />
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
        <div>
          <h2 className="mb-4 text-xl font-semibold text-primary border-b pb-2">Review History & Audit Log</h2>
          <AuditLog entries={auditLog} />
        </div>
      )}

      {activeView === "published-events" && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-primary border-b pb-2">Published Events ({publishedEvents.length})</h2>
          <div className="space-y-3">
            {publishedEvents.length > 0 ? (
              publishedEvents.map((event) => (
                <div key={event.id} className="surface-card p-4 text-sm border border-slate-200 rounded-lg">
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="mt-1 text-secondary">📅 {new Date(event.date).toLocaleString()}</p>
                  <p className="text-secondary">📍 {event.location}</p>
                </div>
              ))
            ) : (
              <div className="surface-card p-4 text-sm text-secondary text-center rounded-lg">
                No published events
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "cancelled-events" && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-primary border-b pb-2">Cancelled Events ({cancelledEvents.length})</h2>
          <div className="space-y-3">
            {cancelledEvents.length > 0 ? (
              cancelledEvents.map((event) => (
                <div key={event.id} className="surface-card p-4 text-sm border border-slate-200 rounded-lg">
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="mt-1 text-secondary">📅 {new Date(event.date).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="surface-card p-4 text-sm text-secondary text-center rounded-lg">
                No cancelled events
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "deleted-events" && (
        <div>
          <h2 className="mb-4 text-xl font-semibold text-primary border-b pb-2">Deleted Events ({deletedEvents.length})</h2>
          <div className="space-y-3">
            {deletedEvents.length > 0 ? (
              deletedEvents.map((event) => (
                <div key={event.id} className="surface-card p-4 text-sm border border-slate-200 rounded-lg">
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="mt-1 text-secondary">🗑️ Deleted: {new Date(event.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <div className="surface-card p-4 text-sm text-secondary text-center rounded-lg">
                No deleted events
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
