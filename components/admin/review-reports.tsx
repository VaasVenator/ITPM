"use client";

import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type EventCategory = "SPORTS" | "MUSICAL" | "WORKSHOPS" | "EXHIBITIONS" | "CULTURAL" | "RELIGIOUS";

export type ReviewReportRow = {
  id: string;
  eventId: string;
  eventName: string;
  eventCategory: EventCategory;
  userName: string;
  userId: string;
  rating: number;
  comment: string;
  anonymous: boolean;
  moderationStatus: ReviewStatus;
  adminComment: string | null;
  createdAt: string;
  moderatedAt: string | null;
};

type ReportFilters = {
  from: string;
  to: string;
  eventName: string;
  category: string;
};

type ChartItem = {
  label: string;
  value: number;
  hint?: string;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "cyan";
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

const STATUS_TONES: Record<ReviewStatus, "indigo" | "emerald" | "rose"> = {
  PENDING: "indigo",
  APPROVED: "emerald",
  REJECTED: "rose"
};

const TONE_STYLES: Record<NonNullable<ChartItem["tone"]>, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500"
};

const STATUS_BADGE_STYLES: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800"
};

function averageRating(items: ReviewReportRow[]) {
  if (!items.length) return 0;
  return Number((items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

function chartToneForIndex(index: number): NonNullable<ChartItem["tone"]> {
  const tones: NonNullable<ChartItem["tone"]>[] = ["indigo", "emerald", "amber", "rose", "cyan"];
  return tones[index % tones.length];
}

function filterByDateRange(reviews: ReviewReportRow[], from: string, to: string) {
  return reviews.filter((review) => {
    const createdAt = new Date(review.createdAt);
    if (from) {
      const fromDate = new Date(from);
      if (createdAt < fromDate) return false;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (createdAt > toDate) return false;
    }
    return true;
  });
}

function BarChartCard({
  title,
  subtitle,
  items,
  valueSuffix = "",
  maxLabel = "",
  emptyMessage = "No data available."
}: {
  title: string;
  subtitle: string;
  items: ChartItem[];
  valueSuffix?: string;
  maxLabel?: string;
  emptyMessage?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 0) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <p className="mt-1 text-sm text-secondary">{subtitle}</p>
        </div>
        {maxLabel ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-secondary">{maxLabel}</span> : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => {
            const width = `${Math.max(8, (item.value / maxValue) * 100)}%`;
            const tone = item.tone || "indigo";
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-primary">{item.label}</span>
                  <span className="text-secondary">
                    {item.value.toFixed(item.value % 1 === 0 ? 0 : 1)}{valueSuffix}{item.hint ? ` • ${item.hint}` : ""}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`${TONE_STYLES[tone]} h-full rounded-full`} style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewReports({ reviews }: { reviews: ReviewReportRow[] }) {
  const [filters, setFilters] = useState<ReportFilters>({
    from: "",
    to: "",
    eventName: "",
    category: "ALL"
  });
  const [exporting, setExporting] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(reviews.map((review) => review.eventCategory))).sort(),
    [reviews]
  );

  const filteredReviews = useMemo(() => {
    const dateFiltered = filterByDateRange(reviews, filters.from, filters.to);
    return dateFiltered.filter((review) => {
      const matchesEvent = review.eventName.toLowerCase().includes(filters.eventName.trim().toLowerCase());
      const matchesCategory = filters.category === "ALL" || review.eventCategory === filters.category;
      return matchesEvent && matchesCategory;
    });
  }, [filters.category, filters.eventName, filters.from, filters.to, reviews]);

  const approvedReviews = useMemo(
    () => filteredReviews.filter((review) => review.moderationStatus === "APPROVED"),
    [filteredReviews]
  );

  const pendingReviews = useMemo(
    () => filteredReviews.filter((review) => review.moderationStatus === "PENDING"),
    [filteredReviews]
  );

  const rejectedReviews = useMemo(
    () => filteredReviews.filter((review) => review.moderationStatus === "REJECTED"),
    [filteredReviews]
  );

  const overallAverage = averageRating(approvedReviews);

  const eventStats = useMemo(() => {
    const grouped = new Map<string, { eventId: string; eventName: string; totalRating: number; count: number; category: EventCategory }>();
    for (const review of approvedReviews) {
      const current = grouped.get(review.eventId) || {
        eventId: review.eventId,
        eventName: review.eventName,
        totalRating: 0,
        count: 0,
        category: review.eventCategory
      };
      current.totalRating += review.rating;
      current.count += 1;
      grouped.set(review.eventId, current);
    }
    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        average: Number((entry.totalRating / entry.count).toFixed(1))
      }))
      .sort((a, b) => b.average - a.average || b.count - a.count || a.eventName.localeCompare(b.eventName));
  }, [approvedReviews]);

  const bestPerformingEvents = eventStats.slice(0, 5);
  const eventRatingChartItems = eventStats.slice(0, 8).map((entry, index) => ({
    label: entry.eventName,
    value: entry.average,
    hint: `${entry.count} review${entry.count === 1 ? "" : "s"}`,
    tone: chartToneForIndex(index)
  }));

  const statusChartItems: ChartItem[] = [
    { label: "Approved", value: approvedReviews.length, tone: "emerald" },
    { label: "Pending", value: pendingReviews.length, tone: "amber" },
    { label: "Rejected", value: rejectedReviews.length, tone: "rose" }
  ];

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const review of filteredReviews) {
      map.set(review.eventCategory, (map.get(review.eventCategory) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, value], index) => ({ label, value, tone: chartToneForIndex(index) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [filteredReviews]);

  const feedbackSummary = useMemo(() => {
    const positive = approvedReviews.filter((review) => review.rating >= 4).length;
    const neutral = approvedReviews.filter((review) => review.rating === 3).length;
    const needsAttention = approvedReviews.filter((review) => review.rating <= 2).length;
    const totalApproved = approvedReviews.length;
    const total = filteredReviews.length;
    const approvalRate = total === 0 ? 0 : Number(((totalApproved / total) * 100).toFixed(1));

    return {
      positive,
      neutral,
      needsAttention,
      totalApproved,
      total,
      approvalRate,
      average: overallAverage
    };
  }, [approvedReviews, filteredReviews.length, overallAverage]);

  async function exportPdf() {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const title = "Event Review Analytics Report";
      const subtitle = `Generated on ${new Date().toLocaleString()}`;
      const filterLabel = [
        filters.from ? `From ${formatDateOnly(filters.from)}` : "From any date",
        filters.to ? `To ${formatDateOnly(filters.to)}` : "To any date",
        filters.eventName.trim() ? `Event: ${filters.eventName.trim()}` : "All event names",
        filters.category === "ALL" ? "All categories" : `Category: ${filters.category}`
      ].join(" • ");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(title, pageWidth / 2, 38, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(subtitle, pageWidth / 2, 56, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text(filterLabel, pageWidth / 2, 72, { align: "center", maxWidth: pageWidth - 80 });
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 92,
        head: [["Metric", "Value"]],
        body: [
          ["Filtered Reviews", String(filteredReviews.length)],
          ["Approved Reviews", String(approvedReviews.length)],
          ["Pending Reviews", String(pendingReviews.length)],
          ["Rejected Reviews", String(rejectedReviews.length)],
          ["Average Approved Rating", overallAverage.toFixed(1)],
          ["Approval Rate", `${feedbackSummary.approvalRate.toFixed(1)}%`]
        ],
        headStyles: { fillColor: [17, 24, 39] },
        alternateRowStyles: { fillColor: [243, 244, 246] },
        styles: { fontSize: 10 },
        margin: { left: 40, right: 40 }
      } as any);

      const afterSummaryY = (doc as any).lastAutoTable.finalY as number;

      autoTable(doc, {
        startY: afterSummaryY + 14,
        head: [["Best Event", "Average Rating", "Approved Reviews"]],
        body: bestPerformingEvents.length
          ? bestPerformingEvents.map((event) => [event.eventName, event.average.toFixed(1), String(event.count)])
          : [["No approved reviews", "—", "0"]],
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [236, 253, 245] },
        styles: { fontSize: 10 },
        margin: { left: 40, right: 40 }
      } as any);

      const afterBestY = (doc as any).lastAutoTable.finalY as number;

      autoTable(doc, {
        startY: afterBestY + 14,
        head: [["Event", "Category", "Status", "Rating", "Anonymous", "Created At", "Comment"]],
        body: filteredReviews.map((review) => [
          review.eventName,
          review.eventCategory,
          STATUS_LABELS[review.moderationStatus],
          `${review.rating}/5`,
          review.anonymous ? "Yes" : "No",
          formatDate(review.createdAt),
          review.comment
        ]),
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellWidth: "wrap" },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 70 },
          2: { cellWidth: 70 },
          3: { cellWidth: 48 },
          4: { cellWidth: 55 },
          5: { cellWidth: 95 },
          6: { cellWidth: 180 }
        },
        margin: { left: 40, right: 40 }
      } as any);

      const fileName = `review_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">Review Reporting</p>
          <h2 className="mt-2 text-3xl font-black">Feedback & Rating Reports</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">
            Inspect review performance, see the highest-rated events, and export the currently filtered analytics as a PDF report.
          </p>
        </div>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Generating PDF..." : "Download Report"}
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-4">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-primary">From date</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-primary">To date</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <label className="grid gap-2 text-sm lg:col-span-1">
          <span className="font-semibold text-primary">Event name</span>
          <input
            type="text"
            value={filters.eventName}
            onChange={(event) => setFilters((current) => ({ ...current, eventName: event.target.value }))}
            placeholder="Search an event"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>

        <div className="flex items-end gap-3">
          <label className="grid flex-1 gap-2 text-sm">
            <span className="font-semibold text-primary">Category</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFilters({ from: "", to: "", eventName: "", category: "ALL" })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Filtered Reviews</p>
          <p className="mt-2 text-2xl font-bold text-primary">{filteredReviews.length}</p>
          <p className="mt-1 text-sm text-secondary">Across all moderation states</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Approved Average</p>
          <p className="mt-2 text-2xl font-bold text-primary">{overallAverage.toFixed(1)} / 5</p>
          <p className="mt-1 text-sm text-secondary">Approved reviews only</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Approval Rate</p>
          <p className="mt-2 text-2xl font-bold text-primary">{feedbackSummary.approvalRate.toFixed(1)}%</p>
          <p className="mt-1 text-sm text-secondary">Approved vs total filtered reviews</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase text-secondary">Best Event</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {bestPerformingEvents[0]?.eventName || "No approved reviews"}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {bestPerformingEvents[0] ? `${bestPerformingEvents[0].average.toFixed(1)} / 5` : "Waiting for more data"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <BarChartCard
          title="Average rating per event"
          subtitle="Highest-rated events from approved reviews within the current filter range."
          items={eventRatingChartItems}
          valueSuffix=" / 5"
          maxLabel="Approved only"
          emptyMessage="No approved reviews for the selected filters."
        />

        <BarChartCard
          title="Review moderation breakdown"
          subtitle="How the current filtered review set is distributed across review states."
          items={statusChartItems}
          maxLabel="All statuses"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-primary">Best performing events</h3>
          <p className="mt-1 text-sm text-secondary">Ranked by approved review average, then by review count.</p>
          <div className="mt-4 space-y-3">
            {bestPerformingEvents.length ? (
              bestPerformingEvents.map((event, index) => (
                <div key={event.eventId} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-primary">#{index + 1} {event.eventName}</p>
                    <p className="text-xs text-secondary">{event.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{event.average.toFixed(1)} / 5</p>
                    <p className="text-xs text-secondary">{event.count} approved review{event.count === 1 ? "" : "s"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-secondary">
                No approved reviews in the selected range.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-primary">Feedback summary</h3>
          <p className="mt-1 text-sm text-secondary">A quick read on how the current review set feels overall.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">Positive</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{feedbackSummary.positive}</p>
              <p className="text-sm text-emerald-800">Ratings of 4 or 5</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs font-semibold uppercase text-slate-700">Neutral</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{feedbackSummary.neutral}</p>
              <p className="text-sm text-slate-700">Ratings of 3</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="text-xs font-semibold uppercase text-rose-700">Needs attention</p>
              <p className="mt-1 text-2xl font-bold text-rose-900">{feedbackSummary.needsAttention}</p>
              <p className="text-sm text-rose-800">Ratings of 1 or 2</p>
            </div>
            <div className="rounded-xl bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase text-cyan-700">Approved reviews</p>
              <p className="mt-1 text-2xl font-bold text-cyan-900">{feedbackSummary.totalApproved}</p>
              <p className="text-sm text-cyan-800">Visible in public review feeds</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-secondary">
            <p>
              Current range covers <span className="font-semibold text-primary">{feedbackSummary.total}</span> total reviews with an overall approved average of <span className="font-semibold text-primary">{feedbackSummary.average.toFixed(1)} / 5</span>.
            </p>
            <p className="mt-1">
              Use the filters above to narrow the report to a single event, category, or date range before downloading.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <BarChartCard
          title="Review volume by category"
          subtitle="Counts of filtered reviews grouped by event category."
          items={categoryStats}
          maxLabel="Filtered reviews"
          emptyMessage="No category data for the selected filters."
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-primary">All reviews in this report</h3>
          <p className="mt-1 text-sm text-secondary">Sorted newest first. This table follows the active filters.</p>
          <div className="mt-4 space-y-3">
            {filteredReviews.length ? (
              filteredReviews.slice(0, 12).map((review) => (
                <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary">{review.eventName}</p>
                      <p className="text-xs text-secondary">{review.eventCategory} • {formatDate(review.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[review.moderationStatus]}`}>
                      {STATUS_LABELS[review.moderationStatus]}
                    </span>
                  </div>
                  <p className="mt-2 text-secondary">By: {review.anonymous ? "Anonymous" : review.userName}</p>
                  <p className="text-secondary">Rating: {review.rating}/5</p>
                  <p className="mt-2 text-secondary">{review.comment}</p>
                  {review.adminComment ? (
                    <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-secondary">
                      Admin note: {review.adminComment}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-secondary">
                No reviews match the current filters.
              </p>
            )}
          </div>
          {filteredReviews.length > 12 ? (
            <p className="mt-3 text-xs text-secondary">Showing the latest 12 entries. The PDF export includes the full filtered dataset.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
