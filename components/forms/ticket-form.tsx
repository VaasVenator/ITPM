"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3 | 4;

const STEPS: Array<{ id: Step; title: string; subtitle: string }> = [
  { id: 1, title: "Event profile", subtitle: "Review event" },
  { id: 2, title: "Ticket form", subtitle: "Guest details" },
  { id: 3, title: "Payment", subtitle: "Upload slip" },
  { id: 4, title: "Complete", subtitle: "Await review" }
];

const TICKET_TIERS = [
  { id: "early-bird", label: "Early Bird", price: 1500, note: "Best value limited release" },
  { id: "standard", label: "Standard Access", price: 2500, note: "General event admission" },
  { id: "executive-vip", label: "Executive VIP", price: 5000, note: "Premium seating and priority entry" }
] as const;

export function TicketForm({
  eventId,
  eventName,
  eventDate,
  eventVenue,
  posterImage,
  remainingForUser,
  seatsLeft,
  currentUserName,
  currentUserEmail
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventVenue: string;
  posterImage?: string | null;
  remainingForUser: number;
  seatsLeft: number;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [paymentSlip, setPaymentSlip] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedTierId, setSelectedTierId] = useState<(typeof TICKET_TIERS)[number]["id"]>("standard");
  const [guestName, setGuestName] = useState(currentUserName ?? "");
  const [guestEmail, setGuestEmail] = useState(currentUserEmail ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedTier = useMemo(
    () => TICKET_TIERS.find((tier) => tier.id === selectedTierId) ?? TICKET_TIERS[1],
    [selectedTierId]
  );
  const numericPrice = selectedTier.price;

  const totalPayable = useMemo(() => (numericPrice * Math.max(1, quantity)).toFixed(2), [numericPrice, quantity]);

  function goToNextStep() {
    setError("");

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (remainingForUser <= 0) {
        setError("You have already reached the maximum of 5 tickets for this event.");
        return;
      }
      if (!guestName.trim()) {
        setError("Guest name is required.");
        return;
      }
      if (!guestEmail.trim()) {
        setError("Guest email is required.");
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > remainingForUser) {
        setError(`You can buy between 1 and ${remainingForUser} ticket(s).`);
        return;
      }
      setStep(3);
    }
  }

  function goToPreviousStep() {
    setError("");
    setStep((current) => Math.max(1, current - 1) as Step);
  }

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
        body: JSON.stringify({
          eventId,
          paymentSlip,
          displayedPrice: String(selectedTier.price),
          ticketTier: selectedTier.label,
          quantity,
          guestName,
          guestEmail,
          guestPhone,
          notes
        })
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Ticket submission failed.");
        return;
      }

      setStep(4);
    } catch {
      setError("Network error while submitting payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_25px_65px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {STEPS.map((item) => {
              const isActive = item.id === step;
              const isComplete = item.id < step;
              return (
                <div key={item.id} className="flex min-w-[9rem] flex-1 items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                      isComplete
                        ? "bg-accent text-white"
                        : isActive
                          ? "bg-primary text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {item.id}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{item.title}</p>
                    <p className="text-xs text-secondary">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 md:p-7">
          {step === 1 ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Ticket purchase flow</p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-primary">{eventName}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
                    Review the event poster and timing first, then continue through the guided purchase flow to upload your payment slip.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Time</p>
                    <p className="mt-2 text-sm font-bold text-primary">{eventDate}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Venue</p>
                    <p className="mt-2 text-sm font-bold text-primary">{eventVenue}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-highlight/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Ticket</p>
                    <p className="mt-2 text-sm font-bold text-primary">{selectedTier.label}</p>
                    <p className="mt-1 text-xs text-secondary">Seats left: {seatsLeft}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                {posterImage ? (
                  <img src={posterImage} alt={`${eventName} poster`} className="h-72 w-full object-cover" />
                ) : (
                  <div className="h-72 w-full bg-gradient-to-br from-emerald-100 via-white to-slate-100" />
                )}
                <div className="space-y-3 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Event poster</p>
                    <p className="mt-2 text-lg font-bold text-primary">{eventName}</p>
                  </div>
                  <Button type="button" onClick={goToNextStep} disabled={remainingForUser <= 0}>
                    {remainingForUser <= 0 ? "Ticket limit reached" : "Buy tickets"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Guest details</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-primary">Enter ticket holder information</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-text">Full name</label>
                    <input className="input-field" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Enter guest name" />
                  </div>
                  <div>
                    <label className="label-text">Email</label>
                    <input className="input-field" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Enter guest email" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-text">Access tier</label>
                    <select
                      className="select-field"
                      value={selectedTierId}
                      onChange={(e) => setSelectedTierId(e.target.value as (typeof TICKET_TIERS)[number]["id"])}
                    >
                      {TICKET_TIERS.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label} - Rs. {tier.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Phone number</label>
                    <input className="input-field" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Optional contact number" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                    />
                  </div>
                </div>

                <div>
                  <label className="label-text">Special notes</label>
                  <textarea
                    className="textarea-field"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional note for the organiser"
                  />
                </div>
              </form>

              <aside className="rounded-[1.75rem] border border-emerald-100 bg-highlight/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Purchase summary</p>
                <div className="mt-4 space-y-3 text-sm text-primary">
                  <div className="flex items-center justify-between gap-3">
                    <span>Event</span>
                    <span className="font-semibold">{eventName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Tier</span>
                    <span className="font-semibold">{selectedTier.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Price per ticket</span>
                    <span className="font-semibold">Rs. {selectedTier.price.toLocaleString("en-LK")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Quantity</span>
                    <span className="font-semibold">{quantity}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-emerald-200 pt-3 text-base font-bold">
                    <span>Total payable</span>
                    <span>Rs. {Number(totalPayable).toLocaleString("en-LK")}</span>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {step === 3 ? (
            <form className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={onSubmit}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Payment details</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-primary">Upload your bank slip</h3>
                  <p className="mt-2 text-sm text-secondary">
                    Attach the payment confirmation image for the exact amount shown in the summary card.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-dashed border-emerald-300 bg-highlight/35 p-5">
                  <label className="label-text">Bank slip image</label>
                  <input className="input-field" type="file" accept="image/*" onChange={(e) => void onPickSlip(e.target.files?.[0] ?? null)} />
                  <p className="mt-3 text-xs text-secondary">Accepted: JPG, PNG. Maximum size: 1MB.</p>
                  {paymentSlip ? (
                    <img src={paymentSlip} alt="Bank slip preview" className="mt-4 h-64 w-full rounded-2xl border border-slate-200 bg-white object-contain" />
                  ) : null}
                </div>
              </div>

              <aside className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Checkout</p>
                <div className="mt-4 space-y-3 text-sm text-primary">
                  <div className="flex items-center justify-between gap-3">
                    <span>Guest</span>
                    <span className="font-semibold">{guestName || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Email</span>
                    <span className="font-semibold">{guestEmail || "Not provided"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Phone</span>
                    <span className="font-semibold">{guestPhone || "Optional"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Tier</span>
                    <span className="font-semibold">{selectedTier.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Quantity</span>
                    <span className="font-semibold">{quantity}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-base font-bold">
                    <span>Total payable</span>
                    <span>Rs. {Number(totalPayable).toLocaleString("en-LK")}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Proceed to checkout"}
                  </Button>
                </div>
              </aside>
            </form>
          ) : null}

          {step === 4 ? (
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-highlight text-accent">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Ticket purchase completion</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-primary">Payment submitted successfully</h3>
              <p className="mt-4 text-sm leading-6 text-secondary">
                We will review the payment slip and get back to you by email after verification.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Return to home page
                </Link>
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50">
                  Review event again
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {step > 1 && step < 4 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={goToPreviousStep} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-slate-50">
            Back
          </button>
          {step === 2 ? (
            <Button type="button" onClick={goToNextStep}>
              Next
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

