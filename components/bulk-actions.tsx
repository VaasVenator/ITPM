"use client";

import { useState } from "react";
import { useToast } from "./toast";

interface BulkActionsProps<T> {
  items: T[];
  selectedIds: Set<string>;
  onSelectAll: (select: boolean) => void;
  onToggleSelect: (id: string) => void;
  itemLabel: string;
  onApproveAll: (comment: string) => Promise<void>;
  onRejectAll: (reason: string) => Promise<void>;
  isProcessing: boolean;
}

export function BulkActions<T extends { id: string }>({
  items,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  itemLabel,
  onApproveAll,
  onRejectAll,
  isProcessing,
}: BulkActionsProps<T>) {
  const [showBulkApprove, setShowBulkApprove] = useState(false);
  const [showBulkReject, setShowBulkReject] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const { addToast } = useToast();

  const handleBulkApprove = async () => {
    if (!approveComment.trim()) {
      addToast("Please add a comment before approving", "error");
      return;
    }

    await onApproveAll(approveComment);
    setApproveComment("");
    setShowBulkApprove(false);
  };

  const handleBulkReject = async () => {
    if (!rejectReason.trim()) {
      addToast("Please explain rejection reason", "error");
      return;
    }

    await onRejectAll(rejectReason);
    setRejectReason("");
    setShowBulkReject(false);
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between bg-slate-50 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.size === items.length && items.length > 0}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-5 h-5 rounded cursor-pointer"
            aria-label="Select all items"
          />
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} of {items.length} {itemLabel} selected
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkApprove(true)}
              disabled={isProcessing}
              className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              ✓ Approve ({selectedIds.size})
            </button>
            <button
              onClick={() => setShowBulkReject(true)}
              disabled={isProcessing}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              ✕ Reject ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {showBulkApprove && (
        <div className="mt-3 p-4 rounded-lg border border-green-200 bg-green-50 space-y-3">
          <h3 className="font-semibold text-primary">
            Approve {selectedIds.size} {itemLabel}?
          </h3>
          <textarea
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            placeholder="Add comment for all selected items..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-green-500 px-3 py-2 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Confirm Bulk Approval"}
            </button>
            <button
              onClick={() => setShowBulkApprove(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-medium transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showBulkReject && (
        <div className="mt-3 p-4 rounded-lg border border-red-200 bg-red-50 space-y-3">
          <h3 className="font-semibold text-primary">
            Reject {selectedIds.size} {itemLabel}?
          </h3>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for bulk rejection (will be sent to all)..."
            rows={2}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBulkReject}
              disabled={isProcessing}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Confirm Bulk Rejection"}
            </button>
            <button
              onClick={() => setShowBulkReject(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-medium transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
