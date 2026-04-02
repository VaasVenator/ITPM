"use client";

import { useState } from "react";
import { useToast } from "./toast";

interface TicketApprovalCardProps {
  ticket: {
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
  };
  onApproveSuccess: () => void;
  onRejectSuccess: () => void;
}

function parseTicketQuantity(notes: string | null | undefined): number {
  if (!notes) return 1;
  const match = notes.match(/quantity:(\d+)/i);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function TicketApprovalCard({
  ticket,
  onApproveSuccess,
  onRejectSuccess,
}: TicketApprovalCardProps) {
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToast } = useToast();

  const quantity = parseTicketQuantity(ticket.notes);
  const totalAmount = Number(ticket.price) * quantity;

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("adminComment", approveComment);

      const res = await fetch(`/api/admin/tickets/${ticket.id}/approve`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        addToast(error.error || "Failed to approve ticket", "error");
        return;
      }

      addToast(
        `✓ Ticket for ${ticket.user.name} approved successfully`,
        "success"
      );
      setApproveComment("");
      setShowApproveForm(false);
      onApproveSuccess();
    } catch (error) {
      addToast("Error approving ticket. Please try again.", "error");
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

      const res = await fetch(`/api/admin/tickets/${ticket.id}/reject`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        addToast(error.error || "Failed to reject ticket", "error");
        return;
      }

      addToast(
        `✓ Ticket for ${ticket.user.name} rejected successfully`,
        "success"
      );
      setRejectReason("");
      setShowRejectForm(false);
      onRejectSuccess();
    } catch (error) {
      addToast("Error rejecting ticket. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-card p-4 text-sm border border-slate-200 hover:border-slate-300 transition rounded-xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-semibold text-primary mb-3">
            {ticket.user.name} → {ticket.event.name}
          </p>

          <div className="space-y-1 text-secondary mb-3">
            <p className="flex items-center gap-2">
              <span>🎟️</span>
              <span>Quantity: <strong>{quantity}</strong></span>
            </p>
            <p className="flex items-center gap-2">
              <span>💰</span>
              <span>Per Ticket: <strong>LKR {Number(ticket.price).toFixed(2)}</strong></span>
            </p>
            <p className="flex items-center gap-2">
              <span>📊</span>
              <span>Total: <strong className="text-lg text-primary">LKR {totalAmount.toFixed(2)}</strong></span>
            </p>
          </div>

          <div className="text-xs text-secondary">
            <p>👤 {ticket.user.email}</p>
            <p>📅 Submitted: {new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div>
          {ticket.paymentSlip.startsWith("data:image/") ? (
            !imageError ? (
              <img
                src={ticket.paymentSlip}
                alt={`Payment slip for ${ticket.user.name}`}
                onError={() => setImageError(true)}
                className="w-full rounded-lg border border-slate-200 object-contain bg-white h-48"
              />
            ) : (
              <div className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-secondary text-sm">
                Failed to load image
              </div>
            )
          ) : (
            <div className="w-full h-48 rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center break-all text-secondary text-sm overflow-auto">
              {ticket.paymentSlip}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {!showApproveForm && !showRejectForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApproveForm(true)}
              className="flex-1 rounded-lg bg-green-500 px-3 py-2 font-semibold text-white transition hover:bg-green-600 active:scale-95"
            >
              ✓ Approve Payment
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 font-semibold text-white transition hover:bg-red-600 active:scale-95"
            >
              ✕ Reject Payment
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
              placeholder="Add a note..."
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
              placeholder="Why is this payment being rejected?..."
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
