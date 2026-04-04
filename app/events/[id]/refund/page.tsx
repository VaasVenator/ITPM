"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Person = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
};

type CompletionData = {
  eventName: string;
  eventVenue: string;
  eventDate: string;
  eventImage?: string;
  attendees: Person[];
  guests: Person[];
  earlyBirdQty: number;
  standardQty: number;
  executiveVipQty: number;
  paymentAmount: number;
  paymentBranch: string;
  paymentDate: string;
};

type TicketItem = {
  id: string;
  label: string;
  tier: string;
  reference: string;
  price: number;
  refundable: boolean;
};

const REFUND_REASONS = [
  { id: "change-of-plans", label: "Change of Plans" },
  { id: "emergency", label: "Emergency" },
  { id: "dissatisfied", label: "Dissatisfied" }
] as const;

function money(value: number) {
  return `Rs. ${value.toFixed(2)}`;
}

export default function RefundRequestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<CompletionData | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>("change-of-plans");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(`payment-complete-${params.id}`);

    if (stored) {
      try {
        setData(JSON.parse(stored) as CompletionData);
      } catch {
        setData(null);
      }
    }

    setLoaded(true);
  }, [params.id]);

  const tickets = useMemo<TicketItem[]>(() => {
    if (!data) return [];

    const items: TicketItem[] = [];
    let counter = 1;

    const addTickets = (
      count: number,
      label: string,
      tier: string,
      price: number
    ) => {
      for (let i = 0; i < count; i += 1) {
        items.push({
          id: `${label.toLowerCase().replace(/\s+/g, "-")}-${counter}`,
          label,
          tier,
          reference: `Ticket ID: #NX-${params.id.toUpperCase().slice(0, 6)}-${String(counter).padStart(3, "0")}`,
          price,
          refundable: true
        });
        counter += 1;
      }
    };

    addTickets(data.earlyBirdQty, "Early Bird", "Tier 1", 1500);
    addTickets(data.standardQty, "Standard Access", "Tier 1", 2500);
    addTickets(data.executiveVipQty, "Executive VIP", "Tier 1", 5000);

    return items;
  }, [data, params.id]);

  const selectedTicketItems = useMemo(
    () => tickets.filter((ticket) => selectedTickets.includes(ticket.id)),
    [tickets, selectedTickets]
  );

  const subtotal = useMemo(
    () => selectedTicketItems.reduce((sum, ticket) => sum + ticket.price, 0),
    [selectedTicketItems]
  );

  const serviceFee = useMemo(() => Number((subtotal * 0.03).toFixed(2)), [subtotal]);
  const cancellationFee = useMemo(() => Number((subtotal * 0.1).toFixed(2)), [subtotal]);
  const estimatedRefund = useMemo(
    () => Math.max(0, Number((subtotal - serviceFee - cancellationFee).toFixed(2))),
    [subtotal, serviceFee, cancellationFee]
  );

  function toggleTicket(id: string) {
    setSelectedTickets((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function handleConfirmCancellation() {
    setError("");

    if (selectedTickets.length === 0) {
      setError("Please select at least one ticket to cancel.");
      return;
    }

    sessionStorage.setItem(
      `refund-request-${params.id}`,
      JSON.stringify({
        eventId: params.id,
        eventName: data?.eventName,
        reason: selectedReason,
        notes,
        tickets: selectedTicketItems,
        subtotal,
        serviceFee,
        cancellationFee,
        estimatedRefund,
        requestedAt: new Date().toISOString()
      })
    );

    router.push(`/events/${params.id}/refund/status`);
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading refund details...</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <h1 className="text-xl font-black text-primary">Request Refund/Cancellation</h1>
          <p className="mt-3 text-sm text-secondary">
            No payment record was found for this event. Complete a payment first before requesting a cancellation.
          </p>

          <div className="mt-5">
            <Link
              href={{ pathname: `/events/${params.id}` }}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Event
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="space-y-6">
        <header className="surface-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-primary">SLIIT VIBE</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-primary">
                Request Refund/Cancellation
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-secondary">
                Select the purchased tickets you want to refund and submit your cancellation request.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-secondary">
              <Link href="/my-events" className="transition hover:text-primary">
                Dashboard
              </Link>
              <Link href="/" className="transition hover:text-primary">
                Events
              </Link>
              <Link
                href={{ pathname: `/events/${params.id}/history` }}
                className="transition hover:text-primary"
              >
                History
              </Link>
            </nav>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
          <section className="space-y-6">
            <section className="surface-card p-6">
              <div className="flex items-center gap-3">
                <span className="text-primary">1</span>
                <h2 className="text-lg font-black text-primary">Select Tickets to Cancel</h2>
              </div>

              <div className="mt-5 space-y-3">
                {tickets.length > 0 ? (
                  tickets.map((ticket) => {
                    const checked = selectedTickets.includes(ticket.id);

                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => toggleTicket(ticket.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                          checked
                            ? "border-primary bg-slate-50 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border text-[11px] font-bold ${
                              checked
                                ? "border-primary bg-primary text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>

                          <div>
                            <p className="text-sm font-bold text-primary">
                              {ticket.label} - {ticket.tier}
                            </p>
                            <p className="mt-1 text-[11px] text-secondary">{ticket.reference}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{money(ticket.price)}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                            {ticket.refundable ? "Refundable" : "Non-refundable"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-secondary">No purchased tickets available for refund.</p>
                )}
              </div>
            </section>

            <section className="surface-card p-6">
              <div className="flex items-center gap-3">
                <span className="text-primary">2</span>
                <h2 className="text-lg font-black text-primary">Reason for Cancellation</h2>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {REFUND_REASONS.map((reason) => {
                  const selected = selectedReason === reason.id;

                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setSelectedReason(reason.id)}
                      className={`rounded-2xl border px-4 py-6 text-center transition ${
                        selected
                          ? "border-primary bg-slate-50 text-primary"
                          : "border-slate-200 bg-white text-secondary hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold">{reason.label}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <label className="label-text">Additional Notes</label>
                <textarea
                  className="textarea-field"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Please provide more details (optional)..."
                />
              </div>

              {error ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={{ pathname: `/events/${params.id}/history` }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
                >
                  Cancel Request
                </Link>

                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Confirm Cancellation
                </button>
              </div>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                Refund Summary
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Tickets ({selectedTicketItems.length})</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Service Fee (Non-refundable)</span>
                  <span>{money(serviceFee)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Cancellation Fee</span>
                  <span>{money(cancellationFee)}</span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/20 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-200">Total Estimated Refund</p>
                  <p className="text-4xl font-black tracking-tight">{money(estimatedRefund)}</p>
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Refund Policy</p>

              <div className="mt-4 space-y-4 text-sm text-secondary">
                <p>1. All purchased tickets are listed separately for individual refund selection.</p>
                <p>2. You can refund one ticket or multiple tickets in the same request.</p>
                <p>3. Service fees and processing charges are non-refundable.</p>
                <p>4. Refunds are processed back to the original payment method within 5 to 10 business days.</p>
              </div>
            </section>

            <section className="surface-card overflow-hidden p-0">
              {data.eventImage ? (
                <img
                  src={data.eventImage}
                  alt={data.eventName}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
              )}

              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                  Event Details
                </p>
                <p className="mt-2 text-sm font-bold text-primary">{data.eventName}</p>
                <p className="mt-1 text-xs text-secondary">{data.eventDate}</p>
                <p className="mt-1 text-xs text-secondary">{data.eventVenue}</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
