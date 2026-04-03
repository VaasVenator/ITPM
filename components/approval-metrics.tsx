"use client";

import { useState } from "react";

interface ApprovalStats {
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number;
  averageReviewTime: number;
  eventApprovals: number;
  ticketApprovals: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  subText?: string;
  bgColor?: string;
}

function StatCard({ label, value, icon, subText, bgColor = "bg-emerald-50" }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-lg border border-slate-200 p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
          {subText && <p className="text-xs text-secondary mt-1">{subText}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export function ApprovalMetrics({
  events,
  tickets,
}: {
  events: Array<{ reviewStatus: string; reviewedAt?: Date | null; createdAt: Date }>;
  tickets: Array<{ reviewStatus: string; reviewedAt?: Date | null; createdAt: Date }>;
}) {
  const allItems = [...events, ...tickets];

  const stats: ApprovalStats = {
    totalApproved: allItems.filter((i) => i.reviewStatus === "APPROVED").length,
    totalRejected: allItems.filter((i) => i.reviewStatus === "REJECTED").length,
    totalPending: allItems.filter((i) => i.reviewStatus === "PENDING").length,
    approvalRate:
      allItems.length > 0
        ? Math.round(
            (allItems.filter((i) => i.reviewStatus === "APPROVED").length / allItems.length) * 100
          )
        : 0,
    averageReviewTime: calculateAverageReviewTime(allItems),
    eventApprovals: events.filter((e) => e.reviewStatus === "APPROVED").length,
    ticketApprovals: tickets.filter((t) => t.reviewStatus === "APPROVED").length,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Approved"
        value={stats.totalApproved}
        icon="✓"
        subText="Both events & tickets"
        bgColor="bg-green-50"
      />
      <StatCard
        label="Total Rejected"
        value={stats.totalRejected}
        icon="✕"
        subText="Needs improvement"
        bgColor="bg-red-50"
      />
      <StatCard
        label="Pending Review"
        value={stats.totalPending}
        icon="⏳"
        subText="Awaiting action"
        bgColor="bg-yellow-50"
      />
      <StatCard
        label="Approval Rate"
        value={`${stats.approvalRate}%`}
        icon="📊"
        subText="Overall success rate"
        bgColor="bg-blue-50"
      />
      <StatCard
        label="Events Approved"
        value={stats.eventApprovals}
        icon="📅"
        subText={`of ${events.length} total`}
      />
      <StatCard
        label="Tickets Approved"
        value={stats.ticketApprovals}
        icon="🎟️"
        subText={`of ${tickets.length} total`}
      />
      <StatCard
        label="Avg Review Time"
        value={`${stats.averageReviewTime}h`}
        icon="⏱️"
        subText="Hours to review"
        bgColor="bg-purple-50"
      />
      <StatCard
        label="Total Items"
        value={allItems.length}
        icon="📦"
        subText="Events + Tickets"
        bgColor="bg-indigo-50"
      />
    </div>
  );
}

function calculateAverageReviewTime(
  items: Array<{ reviewStatus: string; reviewedAt?: Date | null; createdAt: Date }>
): number {
  const reviewed = items.filter((i) => i.reviewStatus !== "PENDING" && i.reviewedAt);

  if (reviewed.length === 0) return 0;

  const totalTime = reviewed.reduce((sum, item) => {
    const created = new Date(item.createdAt).getTime();
    const reviewed = new Date(item.reviewedAt!).getTime();
    const hours = (reviewed - created) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  return Math.round(totalTime / reviewed.length);
}
