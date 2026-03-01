"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TicketForm({ eventId, price }: { eventId: string; price: string }) {
  const [paymentSlip, setPaymentSlip] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!paymentSlip.trim()) {
      setError("Payment slip URL or ref is required.");
      return;
    }

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, price, paymentSlip })
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      setError("Ticket submission failed.");
      return;
    }

    window.location.reload();
  }

  return (
    <form className="space-y-3 rounded-2xl border border-emerald-100 bg-highlight/40 p-4" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-primary">Ticket price: ${price}</p>
      <input
        className="input-field"
        placeholder="Payment slip URL / transaction reference"
        value={paymentSlip}
        onChange={(e) => setPaymentSlip(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit">Submit payment slip</Button>
    </form>
  );
}
