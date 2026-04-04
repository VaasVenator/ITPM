"use client";

import { useState } from "react";

interface AdvancedFiltersProps {
  onFilterChange: (filters: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    category?: string;
  }) => void;
  categories?: string[];
  hasDateRange?: boolean;
}

export function AdvancedFilters({
  onFilterChange,
  categories = [],
  hasDateRange = true,
}: AdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [filterCount, setFilterCount] = useState(0);

  const applyFilters = () => {
    const filters: any = {};

    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (status !== "ALL") filters.status = status;
    if (category !== "ALL") filters.category = category;

    const count = Object.keys(filters).length;
    setFilterCount(count);

    onFilterChange(filters);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatus("ALL");
    setCategory("ALL");
    setFilterCount(0);
    onFilterChange({});
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-primary transition hover:bg-slate-50"
      >
        <span>⚙️ Advanced Filters</span>
        {filterCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-bold">
            {filterCount}
          </span>
        )}
      </button>

      {showFilters && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          {hasDateRange && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={applyFilters}
              className="flex-1 rounded-lg bg-primary px-3 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Apply Filters
            </button>
            {filterCount > 0 && (
              <button
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 px-3 py-2 font-medium transition hover:bg-slate-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
