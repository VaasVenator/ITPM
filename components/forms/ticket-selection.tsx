"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const TICKET_TIERS = [
  {
    id: "executive-vip",
    label: "Executive VIP Pass",
    shortLabel: "Executive VIP",
    price: 5000,
    description: "Full access to premium event zones, priority seating, and curated networking experiences.",
    tags: ["Fast Track Entry", "Lounge Access", "Experience"]
  },
  {
    id: "standard",
    label: "Professional Entry",
    shortLabel: "Standard Access",
    price: 2500,
    description: "Standard access to key sessions, networking spaces, and the main event experience.",
    tags: ["Digital Pass", "Workshops"]
  },
  {
    id: "early-bird",
    label: "NextGen Scholar",
    shortLabel: "Early Bird",
    price: 1500,
    description: "Discounted early-release access with the same core event entry and session coverage.",
    tags: ["Early Release"]
  }
] as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-LK").format(value);
}

export function TicketSelection({
  eventId,
  eventName,
  eventVenue,
  eventImage,
  seatsLeft,
  seatCapacity,
  remainingForUser,
  currentUserName,
  currentUserEmail
}: {
  eventId: string;
  eventName: string;
  eventVenue: string;
  eventImage?: string | null;
  seatsLeft: number;
  seatCapacity: number;
  remainingForUser: number;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [selectedTierId, setSelectedTierId] =
    useState<(typeof TICKET_TIERS)[number]["id"]>("executive-vip");
  const [quantity, setQuantity] = useState(1);
  const [guestName, setGuestName] = useState(currentUserName ?? "");
  const [guestEmail, setGuestEmail] = useState(currentUserEmail ?? "");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentSlip, setPaymentSlip] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTier = useMemo(
    () => TICKET_TIERS.find((tier) => tier.id === selectedTierId) ?? TICKET_TIERS[0],
    [selectedTierId]
  );

  const subtotal = selectedTier.price * quantity;
  const canBuy = remainingForUser > 0 && seatsLeft > 0;

  async function onPickSlip(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
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

    if (!guestName.trim()) {
      setError("Guest name is required.");
      return;
    }

    if (!guestEmail.trim()) {
      setError("Guest email is required.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Math.max(1, remainingForUser)) {
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
        body: JSON.stringify({
          eventId,
          displayedPrice: String(selectedTier.price),
          ticketTier: selectedTier.shortLabel,
          quantity,
          guestName,
          guestEmail,
          guestPhone,
          notes,
          paymentSlip
        })
      });

      if (res.status === 401) {
        window.location.href = `/login?redirect=/events/${eventId}/tickets`;
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Ticket booking failed.");
        return;
      }

      window.location.href = `/events/${eventId}`;
    } catch {
      setError("Network error while booking tickets.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Ticket Selection
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-primary md:text-4xl">
          Select Your Experience
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">
          Choose the tier that fits your needs. Prices match the event rules and seat counts match saved event capacity.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_24rem]">
        <form id="ticket-selection-form" className="space-y-5" onSubmit={onSubmit}>
          {TICKET_TIERS.map((tier) => {
            const isSelected = selectedTierId === tier.id;

            return (
              <label
                key={tier.id}
                className={`block cursor-pointer rounded-[1.75rem] border p-5 transition ${
                  isSelected
                    ? "border-emerald-300 bg-white ring-2 ring-emerald-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="grid gap-5 md:grid-cols-[9rem_1fr_auto]">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {eventImage ? (
                      <img src={eventImage} alt={tier.label} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="h-28 w-full bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="radio"
                        name="ticketTier"
                        checked={isSelected}
                        onChange={() => setSelectedTierId(tier.id)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <h2 className="text-2xl font-black tracking-tight text-primary">
                        {tier.label}
                      </h2>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-secondary">{tier.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tier.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                      {seatsLeft > 0 ? `${seatsLeft} ticket(s) remaining` : "Sold out"}
                    </p>
                  </div>

                  <div className="space-y-4 text-right">
                    <p className="text-3xl font-black tracking-tight text-primary">
                      Rs. {formatMoney(tier.price)}
                    </p>
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg text-lg font-bold text-primary transition hover:bg-slate-200"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        disabled={!isSelected}
                      >
                        -
                      </button>
                      <span className="inline-flex min-w-[2.5rem] justify-center text-sm font-bold text-primary">
                        {isSelected ? quantity : 0}
                      </span>
                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg text-lg font-bold text-primary transition hover:bg-slate-200"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.min(Math.max(1, remainingForUser), current + 1)
                          )
                        }
                        disabled={!isSelected || !canBuy}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}

          <div className="surface-card p-6">
            <h3 className="text-xl font-black tracking-tight text-primary">Booking Details</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-text">Full name</label>
                <input
                  className="input-field"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Email</label>
                <input
                  className="input-field"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-text">Phone number</label>
                <input
                  className="input-field"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Quantity</label>
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  max={Math.max(1, remainingForUser)}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={!canBuy}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label-text">Notes</label>
              <textarea
                className="textarea-field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for organiser"
              />
            </div>

            <div className="mt-4">
              <label className="label-text">Bank Slip</label>
              <input
                className="input-field"
                type="file"
                accept="image/*"
                onChange={(e) => void onPickSlip(e.target.files?.[0] ?? null)}
              />
            </div>

            {paymentSlip ? (
              <img
                src={paymentSlip}
                alt="Slip preview"
                className="mt-4 h-56 w-full rounded-2xl border border-slate-200 bg-white object-contain"
              />
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </div>

          <div className="surface-card overflow-hidden p-6">
            <h3 className="text-center text-2xl font-black tracking-tight text-primary">
              Included in All Tiers
            </h3>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-950 via-slate-800 to-emerald-700 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Main Experience
                </p>
                <p className="mt-24 text-3xl font-black tracking-tight">Main Stage Access</p>
                <p className="mt-2 max-w-md text-sm text-slate-200">
                  Every ticket includes access to the main event sessions and core shared experiences.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-100 p-6">
                <p className="text-lg font-black text-primary">High-Speed Hub</p>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  Reliable venue support, core attendee services, and standard event infrastructure are available across every tier.
                </p>
                <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  Standard Feature
                </p>
              </div>
            </div>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="surface-card p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
              Order Summary
            </p>

            <div className="mt-5 space-y-3 text-sm text-primary">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {selectedTier.shortLabel} x {quantity}
                </span>
                <span className="font-semibold">Rs. {formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Seats left</span>
                <span className="font-semibold">{seatsLeft}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Total capacity</span>
                <span className="font-semibold">{seatCapacity}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-lg font-black">
                <span>Total Amount</span>
                <span>Rs. {formatMoney(subtotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="ticket-selection-form"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canBuy || isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Proceed To Checkout"}
            </button>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-xs text-secondary">
              <p>Purchase protection included for valid bookings.</p>
              <p>Refund policy depends on organiser approval and event status.</p>
              <p>Entry requirements may vary by event guidelines.</p>
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-lg font-black text-primary">{eventName}</p>
            <p className="mt-2 text-sm text-secondary">{eventVenue}</p>
            <div className="mt-4">
              <Link
                href={`/events/${eventId}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-slate-50"
              >
                Back to Event
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

