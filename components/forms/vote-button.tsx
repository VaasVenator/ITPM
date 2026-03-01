"use client";

import { Button } from "@/components/ui/button";

export function VoteButton({ eventId, voteType, label }: { eventId: string; voteType: "RSVP" | "ORGANISER_VOTE"; label: string }) {
  async function submitVote() {
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, voteType })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (res.ok) {
      window.location.reload();
    }
  }

  return <Button onClick={submitVote}>{label}</Button>;
}
