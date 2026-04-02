"use client";

import { useState } from "react";

export interface AuditLogEntry {
  id: string;
  action: "APPROVED" | "REJECTED" | "VIEWED";
  itemType: "event" | "ticket";
  itemName: string;
  reason?: string;
  adminName: string;
  timestamp: Date;
}

interface AuditLogProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
}

export function AuditLog({ entries, isLoading = false }: AuditLogProps) {
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = entries.filter((entry) => {
    const matchesAction = filterAction === "ALL" || entry.action === filterAction;
    const matchesSearch =
      entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.adminName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "VIEWED":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "APPROVED":
        return "✓";
      case "REJECTED":
        return "✕";
      case "VIEWED":
        return "👁️";
      default:
        return "•";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-secondary mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by item or admin name..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-emerald-100 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-secondary mb-1">Action</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-emerald-100 outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="VIEWED">Viewed</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="surface-card border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${getActionColor(entry.action)}`}
                    >
                      {getActionIcon(entry.action)}
                    </span>
                    <p className="font-semibold text-primary truncate">{entry.itemName}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {entry.itemType}
                    </span>
                  </div>

                  <div className="text-xs text-secondary space-y-0.5">
                    <p>
                      <strong>{entry.adminName}</strong> {entry.action.toLowerCase()} this item
                    </p>
                    {entry.reason && <p className="italic text-slate-500">Note: {entry.reason}</p>}
                    <p className="text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getActionColor(entry.action)}`}>
                  {entry.action}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-secondary">
            <p>No audit logs found</p>
          </div>
        )}
      </div>

      <div className="text-xs text-secondary text-center">
        Showing {filteredEntries.length} of {entries.length} entries
      </div>
    </div>
  );
}
