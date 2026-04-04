"use client";

import { useState, useMemo } from "react";
import { useToast } from "./toast";

interface EventApprovalCardProps {
  event: {
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
  };
  onApproveSuccess: () => void;
  onRejectSuccess: () => void;
}

export function EventApprovalCard({
  event,
  onApproveSuccess,
  onRejectSuccess,
}: EventApprovalCardProps) {
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const { addToast } = useToast();

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("adminComment", approveComment);

      const res = await fetch(`/api/admin/events/${event.id}/approve`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        addToast(error.error || "Failed to approve event", "error");
        return;
      }

      addToast(`✓ Event "${event.name}" approved successfully`, "success");
      setApproveComment("");
      setShowApproveForm(false);
      onApproveSuccess();
    } catch (error) {
      addToast("Error approving event. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!rejectReason.trim()) {
      addToast("Rejection reason is required", "error");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("adminComment", rejectReason);

      const res = await fetch(`/api/admin/events/${event.id}/reject`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        addToast(error.error || "Failed to reject event", "error");
        return;
      }

      addToast(`✓ Event "${event.name}" rejected successfully`, "success");
      setRejectReason("");
      setShowRejectForm(false);
      onRejectSuccess();
    } catch (error) {
      addToast("Error rejecting event. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-card p-4 text-sm border border-slate-200 hover:border-slate-300 transition rounded-xl">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {event.eventImage && (
            <img
              src={event.eventImage}
              alt={`${event.name} poster`}
              className="mb-3 h-40 w-full rounded-xl border border-slate-200 object-cover"
            />
          )}

          <p className="font-semibold text-primary">
            {event.name}
            <span className="ml-2 text-xs font-normal text-secondary bg-slate-100 px-2 py-1 rounded">
              {event.category}
            </span>
          </p>

          <div className="mt-2 grid grid-cols-1 gap-1 text-secondary">
            <p>📍 {event.location}</p>
            <p>📅 {new Date(event.date).toLocaleString()}</p>
            <p>👤 by {event.createdBy.name}</p>
            {event.description && <p className="mt-2 italic">{event.description}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
            Submitted By
          </p>
          <p className="mt-2 text-sm font-semibold text-primary">{event.createdBy.name}</p>
          <p className="mt-1 text-xs text-secondary break-all">{event.createdBy.email}</p>
          <p className="mt-2 text-xs">
            <span className="text-secondary">Status: </span>
            <span className="font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
              {event.reviewStatus}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {!showApproveForm && !showRejectForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApproveForm(true)}
              className="flex-1 rounded-lg bg-green-500 px-3 py-2 font-semibold text-white transition hover:bg-green-600 active:scale-95"
            >
              ✓ Approve Event
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 font-semibold text-white transition hover:bg-red-600 active:scale-95"
            >
              ✕ Reject Event
            </button>
          </div>
        )}

        {showApproveForm && (
          <form onSubmit={handleApprove} className="space-y-2 p-3 rounded-xl border border-green-200 bg-green-50">
            <label className="block text-xs font-semibold text-secondary">
              Approval Comment (Optional)
            </label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none"
              placeholder="Add a note for the organizer..."
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-lg bg-green-500 px-3 py-2 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Confirm Approval"}
              </button>
              <button
                type="button"
                onClick={() => setShowApproveForm(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {showRejectForm && (
          <form onSubmit={handleReject} className="space-y-2 p-3 rounded-xl border border-red-200 bg-red-50">
            <label className="block text-xs font-semibold text-secondary">
              Rejection Reason (Required)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-200 outline-none"
              placeholder="Explain why this event is being rejected..."
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !rejectReason.trim()}
                className="flex-1 rounded-lg bg-red-500 px-3 py-2 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Confirm Rejection"}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCategory?: string;
  onFilterChange?: (category: string) => void;
  categories?: string[];
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  filterCategory,
  onFilterChange,
  categories = [],
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end mb-4">
      <div className="flex-1">
        <label className="block text-xs font-semibold text-secondary mb-1">
          Search by event name or organizer
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Type to search..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-emerald-100 outline-none"
        />
      </div>

      {categories.length > 0 && onFilterChange && (
        <div>
          <label className="block text-xs font-semibold text-secondary mb-1">
            Category
          </label>
          <select
            value={filterCategory || ""}
            onChange={(e) => onFilterChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-emerald-100 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
