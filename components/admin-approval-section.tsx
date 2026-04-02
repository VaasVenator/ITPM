"use client";

import { useState, useMemo } from "react";
import { EventApprovalCard, SearchFilter } from "./admin-approval-components";
import { TicketApprovalCard } from "./ticket-approval-card";
import { useToast } from "./toast";

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

interface AdminApprovalSectionProps {
  type: "events" | "tickets";
  title: string;
  items: Event[] | Ticket[];
  emptyMessage: string;
  onItemsChange: (items: Event[] | Ticket[]) => void;
}

export function AdminApprovalSection({
  type,
  title,
  items,
  emptyMessage,
  onItemsChange,
}: AdminApprovalSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const { addToast } = useToast();

  const categories = useMemo(() => {
    if (type !== "events") return [];
    return Array.from(
      new Set((items as Event[]).map((e) => e.category).filter(Boolean))
    ).sort();
  }, [items, type]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();

      if (type === "events") {
        const event = item as Event;
        const matchesSearch =
          event.name.toLowerCase().includes(searchLower) ||
          event.createdBy.name.toLowerCase().includes(searchLower) ||
          event.location.toLowerCase().includes(searchLower);

        const matchesCategory =
          !filterCategory || event.category === filterCategory;

        return matchesSearch && matchesCategory;
      } else {
        const ticket = item as Ticket;
        return (
          ticket.user.name.toLowerCase().includes(searchLower) ||
          ticket.event.name.toLowerCase().includes(searchLower) ||
          ticket.user.email.toLowerCase().includes(searchLower)
        );
      }
    });
  }, [items, searchTerm, filterCategory, type]);

  const handleItemRemove = (itemId: string) => {
    const filtered = items.filter((item) => item.id !== itemId);
    onItemsChange(filtered as Event[] | Ticket[]);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
        <div className="text-sm text-secondary">
          {filteredItems.length} of {items.length} items
        </div>
      </div>

      {items.length > 0 && (
        <SearchFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
          categories={type === "events" ? categories : undefined}
        />
      )}

      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) =>
            type === "events" ? (
              <EventApprovalCard
                key={item.id}
                event={item as Event}
                onApproveSuccess={() => handleItemRemove(item.id)}
                onRejectSuccess={() => handleItemRemove(item.id)}
              />
            ) : (
              <TicketApprovalCard
                key={item.id}
                ticket={item as Ticket}
                onApproveSuccess={() => handleItemRemove(item.id)}
                onRejectSuccess={() => handleItemRemove(item.id)}
              />
            )
          )
        ) : searchTerm || filterCategory ? (
          <div className="surface-card p-6 text-center text-secondary rounded-xl">
            <p className="text-sm">📭 No items match your search criteria</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="surface-card p-6 text-center text-secondary rounded-xl">
            <p className="text-sm">✓ {emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
