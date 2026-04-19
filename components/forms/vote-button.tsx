"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VoteButton({ eventId, voteType, label }: { eventId: string; voteType: "RSVP" | "ORGANISER_VOTE"; label: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function submitVote() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, voteType })
      });

      if (res.status === 401) {
        router.replace(`/login?redirect=/events/${eventId}`);
        return;
      }

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button onClick={submitVote} disabled={submitting}>
      {submitting ? "Please wait..." : label}
    </Button>
  );
}
