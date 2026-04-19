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
  totalItems: number;
  totalEventItems: number;
  totalTicketItems: number;
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
  stats
}: {
  stats: ApprovalStats;
}) {
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
        subText={`of ${stats.totalEventItems} total`}
      />
      <StatCard
        label="Tickets Approved"
        value={stats.ticketApprovals}
        icon="🎟️"
        subText={`of ${stats.totalTicketItems} total`}
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
        value={stats.totalItems}
        icon="📦"
        subText="Events + Tickets"
        bgColor="bg-indigo-50"
      />
    </div>
  );
}
