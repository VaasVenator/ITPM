"use client";

import { useState, useMemo } from "react";
import { EventApprovalCard, SearchFilter } from "./admin-approval-components";
import { TicketApprovalCard } from "./ticket-approval-card";

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
}

interface ApprovalFilterSectionProps {
  events: Event[];
  tickets: Ticket[];
}

type ApprovalType = "both" | "events" | "tickets";

export function ApprovalFilterSection({
  events: initialEvents,
  tickets: initialTickets,
}: ApprovalFilterSectionProps) {
  const [approvalType, setApprovalType] = useState<ApprovalType>("both");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [events, setEvents] = useState(initialEvents);
  const [tickets, setTickets] = useState(initialTickets);

  const categories = useMemo(() => {
    return Array.from(
      new Set(events.map((e) => e.category).filter(Boolean))
    ).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.name.toLowerCase().includes(searchLower) ||
        event.createdBy.name.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower);

      const matchesCategory =
        !filterCategory || event.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [events, searchTerm, filterCategory]);

  const filteredTickets = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.user.name.toLowerCase().includes(searchLower) ||
        ticket.event.name.toLowerCase().includes(searchLower) ||
        ticket.user.email.toLowerCase().includes(searchLower)
    );
  }, [tickets, searchTerm]);

  const handleEventRemove = (eventId: string) => {
    setEvents(events.filter((e) => e.id !== eventId));
  };

  const handleTicketRemove = (ticketId: string) => {
    setTickets(tickets.filter((t) => t.id !== ticketId));
  };

  const showEmptyState = 
    (approvalType === "both" && filteredEvents.length === 0 && filteredTickets.length === 0) ||
    (approvalType === "events" && filteredEvents.length === 0) ||
    (approvalType === "tickets" && filteredTickets.length === 0);

  return (
    <div className="space-y-4">
      {/* Filter Toggle Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setApprovalType("both")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            approvalType === "both"
              ? "bg-primary text-white"
              : "bg-highlight text-primary hover:bg-emerald-100"
          }`}
        >
          📋 Both (Events & Tickets)
        </button>
        <button
          onClick={() => setApprovalType("events")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            approvalType === "events"
              ? "bg-primary text-white"
              : "bg-highlight text-primary hover:bg-emerald-100"
          }`}
        >
          🎉 Events Only
        </button>
        <button
          onClick={() => setApprovalType("tickets")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            approvalType === "tickets"
              ? "bg-primary text-white"
              : "bg-highlight text-primary hover:bg-emerald-100"
          }`}
        >
          🎫 Tickets Only
        </button>
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-3">
        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder={
            approvalType === "events"
              ? "Search events by name, organizer, or location..."
              : approvalType === "tickets"
              ? "Search tickets by user, email, or event..."
              : "Search by event, ticket, organizer, or user..."
          }
        />

        {approvalType !== "tickets" && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                !filterCategory
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-secondary hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  filterCategory === category
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-secondary hover:bg-slate-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Counter */}
      <div className="text-sm text-secondary">
        {approvalType === "both" && (
          <span>
            Showing {filteredEvents.length} event(s) and {filteredTickets.length} ticket(s)
          </span>
        )}
        {approvalType === "events" && (
          <span>Showing {filteredEvents.length} event(s)</span>
        )}
        {approvalType === "tickets" && (
          <span>Showing {filteredTickets.length} ticket(s)</span>
        )}
      </div>

      {/* Empty State */}
      {showEmptyState ? (
        <div className="surface-card rounded-lg p-6 text-center text-secondary">
          <p>
            {approvalType === "both"
              ? "No pending events or tickets to approve."
              : approvalType === "events"
              ? "No pending events to approve."
              : "No pending tickets to approve."}
          </p>
        </div>
      ) : null}

      {/* Events Section */}
      {(approvalType === "both" || approvalType === "events") && filteredEvents.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-primary">
            🎉 Event Approvals ({filteredEvents.length})
          </h3>
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <EventApprovalCard
                key={event.id}
                event={event}
                onApproveSuccess={() => handleEventRemove(event.id)}
                onRejectSuccess={() => handleEventRemove(event.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tickets Section */}
      {(approvalType === "both" || approvalType === "tickets") && filteredTickets.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-primary">
            🎫 Ticket Approvals ({filteredTickets.length})
          </h3>
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketApprovalCard
                key={ticket.id}
                ticket={ticket}
                onApproveSuccess={() => handleTicketRemove(ticket.id)}
                onRejectSuccess={() => handleTicketRemove(ticket.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
