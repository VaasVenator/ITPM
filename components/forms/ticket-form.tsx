"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TicketForm({
  eventId,
  price,
  remainingForUser
}: {
  eventId: string;
  price: string;
  remainingForUser: number;
}) {
  const [paymentSlip, setPaymentSlip] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const numericPrice = Number(String(price).replace(/[^\d.]/g, "")) || 0;

  async function onPickSlip(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image of the bank slip.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Bank slip image must be less than 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentSlip(typeof reader.result === "string" ? reader.result : "");
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (remainingForUser <= 0) {
      setError("You have already reached the maximum of 5 tickets for this event.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > remainingForUser) {
      setError(`You can buy between 1 and ${remainingForUser} ticket(s).`);
      return;
    }

    if (!paymentSlip.trim()) {
      setError("Bank slip image is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, paymentSlip, displayedPrice: price, quantity })
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Ticket submission failed.");
        return;
      }

      window.alert("Payment submitted successfully. We will get back to you with an email soon.");
      window.location.reload();
    } catch {
      setError("Network error while submitting payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3 rounded-2xl border border-emerald-100 bg-highlight/40 p-4" onSubmit={onSubmit}>
      <p className="text-sm font-semibold text-primary">Ticket price: LKR {price}</p>
      <p className="text-xs font-medium text-secondary">Remaining tickets you can buy: {remainingForUser}</p>
      <div>
        <label className="label-text">Quantity</label>
        <input
          className="input-field"
          type="number"
          min={1}
          max={Math.max(1, remainingForUser)}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={remainingForUser <= 0}
          required
        />
      </div>
      <p className="text-xs font-semibold text-primary">Total payable: LKR {(numericPrice * Math.max(1, quantity)).toFixed(2)}</p>
      <div>
        <label className="label-text">Bank Slip Image</label>
        <input className="input-field" type="file" accept="image/*" onChange={(e) => void onPickSlip(e.target.files?.[0] ?? null)} required />
        {paymentSlip ? (
          <img src={paymentSlip} alt="Bank slip preview" className="mt-2 h-36 w-full rounded-xl border border-slate-200 object-cover" />
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting || remainingForUser <= 0}>
        {remainingForUser <= 0 ? "Ticket limit reached (5/5)" : isSubmitting ? "Submitting..." : "Submit payment slip"}
      </Button>
    </form>
  );
}
