"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TicketForm({ eventId, price }: { eventId: string; price: string }) {
  const [paymentSlip, setPaymentSlip] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!paymentSlip.trim()) {
      setError("Bank slip image is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, paymentSlip, displayedPrice: price })
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
      <div>
        <label className="label-text">Bank Slip Image</label>
        <input className="input-field" type="file" accept="image/*" onChange={(e) => void onPickSlip(e.target.files?.[0] ?? null)} required />
        {paymentSlip ? (
          <img src={paymentSlip} alt="Bank slip preview" className="mt-2 h-36 w-full rounded-xl border border-slate-200 object-cover" />
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit payment slip"}</Button>
    </form>
  );
}
