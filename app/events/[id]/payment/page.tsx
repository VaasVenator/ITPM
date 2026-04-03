"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Person = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
};

type StoredRsvpData = {
  eventId: string;
  eventName: string;
  eventVenue: string;
  eventImage?: string;
  eventDate: string;
  attendees: Person[];
  guests: Person[];
  earlyBirdQty?: number;
  standardQty?: number;
  guestQty?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSriLankaNow() {
  const now = new Date();

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  return { date, time };
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [eventName, setEventName] = useState("Event Purchase");
  const [eventVenue, setEventVenue] = useState("Venue not provided");
  const [eventDate, setEventDate] = useState("Date not provided");
  const [eventImage, setEventImage] = useState("");
  const [attendees, setAttendees] = useState<Person[]>([]);
  const [guests, setGuests] = useState<Person[]>([]);

  const [earlyBirdQty, setEarlyBirdQty] = useState(0);
  const [standardQty, setStandardQty] = useState(1);
  const [executiveVipQty, setExecutiveVipQty] = useState(0);

  const sriLankaNow = getSriLankaNow();

  const [paymentBranch, setPaymentBranch] = useState("");
  const [paymentDate, setPaymentDate] = useState(sriLankaNow.date);
  const [paymentTime, setPaymentTime] = useState(sriLankaNow.time);
  const [paymentSlipName, setPaymentSlipName] = useState("");
  const [paymentSlipPreview, setPaymentSlipPreview] = useState("");
  const [error, setError] = useState("");

  const EARLY_BIRD_PRICE = 1500;
  const STANDARD_PRICE = 2500;
  const EXECUTIVE_VIP_PRICE = 5000;

  useEffect(() => {
    const stored = sessionStorage.getItem(`rsvp-payment-${params.id}`);

    if (!stored) {
      setLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as StoredRsvpData;

      setEventName(parsed.eventName || "Event Purchase");
      setEventVenue(parsed.eventVenue || "Venue not provided");
      setEventDate(parsed.eventDate || "Date not provided");
      setEventImage(parsed.eventImage || "");
      setAttendees(Array.isArray(parsed.attendees) ? parsed.attendees : []);
      setGuests(Array.isArray(parsed.guests) ? parsed.guests : []);
      setEarlyBirdQty(clamp(Number(parsed.earlyBirdQty ?? 0), 0, 7));
      setStandardQty(clamp(Number(parsed.standardQty ?? 1), 0, 5));
      setExecutiveVipQty(clamp(Number(parsed.guestQty ?? 0), 0, 3));
    } catch {
      setError("Could not load RSVP details. Please complete RSVP again.");
    } finally {
      setLoaded(true);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getSriLankaNow();
      setPaymentTime(now.time);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const ticketLines = useMemo(() => {
    const lines: Array<{ label: string; qty: number; unitPrice: number }> = [];

    if (earlyBirdQty > 0) {
      lines.push({ label: "Early Bird", qty: earlyBirdQty, unitPrice: EARLY_BIRD_PRICE });
    }

    if (standardQty > 0) {
      lines.push({ label: "Standard Access", qty: standardQty, unitPrice: STANDARD_PRICE });
    }

    if (executiveVipQty > 0) {
      lines.push({ label: "Executive VIP", qty: executiveVipQty, unitPrice: EXECUTIVE_VIP_PRICE });
    }

    return lines;
  }, [earlyBirdQty, standardQty, executiveVipQty]);

  const totalAmount = useMemo(() => {
    return ticketLines.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  }, [ticketLines]);

  const paymentAmount = useMemo(() => String(totalAmount), [totalAmount]);

  function handleSlipChange(file: File | null) {
    setError("");

    if (!file) {
      setPaymentSlipName("");
      setPaymentSlipPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please attach a valid image for the payment slip.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Payment slip must be under 2MB.");
      return;
    }

    setPaymentSlipName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentSlipPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  function updateStoredQuantities() {
    const stored = sessionStorage.getItem(`rsvp-payment-${params.id}`);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as StoredRsvpData;
      parsed.earlyBirdQty = earlyBirdQty;
      parsed.standardQty = standardQty;
      parsed.guestQty = executiveVipQty;
      sessionStorage.setItem(`rsvp-payment-${params.id}`, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (ticketLines.length === 0) {
      setError("Please select at least one ticket before payment.");
      return;
    }

    const numericPaymentAmount = totalAmount;

    if (numericPaymentAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (!paymentBranch.trim()) {
      setError("Please enter the payment branch.");
      return;
    }

    if (!paymentDate) {
      setError("Please select the payment date.");
      return;
    }

    if (!paymentSlipName) {
      setError("Please attach the payment slip before proceeding.");
      return;
    }

    updateStoredQuantities();

    sessionStorage.setItem(
      `payment-complete-${params.id}`,
      JSON.stringify({
        eventName,
        eventVenue,
        eventDate,
        eventImage,
        attendees,
        guests,
        earlyBirdQty,
        standardQty,
        executiveVipQty,
        paymentAmount: numericPaymentAmount,
        paymentBranch,
        paymentDate,
        paymentTime
      })
    );

    router.push(`/events/${params.id}/complete`);
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading payment details...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
        <div className="space-y-6">
          <header className="surface-card p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Payment Checkout</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-primary md:text-5xl">
                  Complete Your Purchase
                </h1>
                <p className="mt-3 text-sm leading-6 text-secondary">
                  Verify attendee details, choose ticket quantities, and upload your payment confirmation.
                </p>
              </div>

              <Link
                href={{ pathname: `/events/${params.id}/history` }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-slate-50"
              >
                View Payment History
              </Link>
            </div>
          </header>

          <section className="surface-card p-6">
            <h2 className="text-xl font-black tracking-tight text-primary">Attendee & Guest Summary</h2>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-primary">Attendees</p>
                  <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-emerald-700">
                    {attendees.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {attendees.length > 0 ? (
                    attendees.map((person, index) => (
                      <div key={`${person.email}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-bold text-primary">{person.name || `Attendee ${index + 1}`}</p>
                        <p className="mt-1 text-sm text-secondary">{person.email || "No email provided"}</p>
                        {person.phone ? <p className="mt-1 text-sm text-secondary">{person.phone}</p> : null}
                        {person.organization ? <p className="mt-1 text-sm text-secondary">{person.organization}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-secondary">No attendee details received.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-primary">Guests</p>
                  <span className="rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-emerald-700">
                    {guests.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {guests.length > 0 ? (
                    guests.map((person, index) => (
                      <div key={`${person.email}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-bold text-primary">{person.name || `Guest ${index + 1}`}</p>
                        <p className="mt-1 text-sm text-secondary">{person.email || "No email provided"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-secondary">No guest details added.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-xl font-black tracking-tight text-primary">Choose Ticket Types</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-emerald-200 bg-highlight/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Early Bird</p>
                <p className="mt-2 text-2xl font-black text-primary">Rs. 1500</p>
                <p className="mt-1 text-sm text-secondary">Maximum 7 tickets</p>
                <input
                  type="number"
                  min={0}
                  max={7}
                  step={1}
                  className="input-field mt-4"
                  value={earlyBirdQty}
                  onChange={(e) => setEarlyBirdQty(clamp(Number(e.target.value), 0, 7))}
                />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Standard Access</p>
                <p className="mt-2 text-2xl font-black text-primary">Rs. 2500</p>
                <p className="mt-1 text-sm text-secondary">Maximum 5 tickets</p>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={1}
                  className="input-field mt-4"
                  value={standardQty}
                  onChange={(e) => setStandardQty(clamp(Number(e.target.value), 0, 5))}
                />
              </div>

              <div className="rounded-[1.5rem] border border-primary bg-primary p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Executive VIP</p>
                <p className="mt-2 text-2xl font-black">Rs. 5000</p>
                <p className="mt-1 text-sm text-slate-200">Maximum 3 tickets</p>
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={1}
                  className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-300"
                  value={executiveVipQty}
                  onChange={(e) => setExecutiveVipQty(clamp(Number(e.target.value), 0, 3))}
                />
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-xl font-black tracking-tight text-primary">Ticket Breakdown</h2>

            <div className="mt-5 space-y-3">
              {ticketLines.length > 0 ? (
                ticketLines.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-primary">{item.label}</p>
                      <p className="mt-1 text-xs text-secondary">
                        Qty: {item.qty} | Unit Price: LKR {item.unitPrice}
                      </p>
                    </div>
                    <p className="text-lg font-black text-primary">
                      LKR {item.qty * item.unitPrice}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary">No ticket selected yet.</p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-100 bg-highlight/40 px-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-secondary">Net Amount To Pay</p>
                <p className="text-4xl font-black tracking-tight text-primary">
                  LKR {totalAmount}
                </p>
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-xl font-black tracking-tight text-primary">Bank Transfer Details</h2>
            <p className="mt-2 text-sm text-secondary">
              Please transfer the total amount to the account below before uploading your slip.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Bank Name</p>
                <p className="mt-2 text-sm font-bold text-primary">Commercial Bank</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Account Number</p>
                <p className="mt-2 text-sm font-bold text-primary">8829 - 0031 - 4452</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Account Name</p>
                <p className="mt-2 text-sm font-bold text-primary">Nexus Events Group Ltd.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Swift / Ref</p>
                <p className="mt-2 text-sm font-bold text-primary">NEXUSGB22</p>
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-xl font-black tracking-tight text-primary">Payment Slip Upload</h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="label-text">Payment Amount</label>
                  <input
                    type="text"
                    className="input-field bg-slate-50"
                    value={paymentAmount}
                    readOnly
                  />
                </div>

                <div>
                  <label className="label-text">Payment Branch</label>
                  <input
                    type="text"
                    className="input-field"
                    value={paymentBranch}
                    onChange={(e) => setPaymentBranch(e.target.value)}
                    placeholder="Enter bank branch"
                    required
                  />
                </div>

                <div>
                  <label className="label-text">Payment Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label-text">Purchase Time</label>
                  <input
                    type="text"
                    className="input-field bg-slate-50"
                    value={paymentTime}
                    readOnly
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  className="input-field"
                  onChange={(e) => handleSlipChange(e.target.files?.[0] ?? null)}
                  required
                />

                {paymentSlipName ? (
                  <p className="mt-4 text-sm font-medium text-primary">
                    Attached slip: {paymentSlipName}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-secondary">
                    Upload JPG, PNG or receipt image under 2MB
                  </p>
                )}

                {paymentSlipPreview ? (
                  <img
                    src={paymentSlipPreview}
                    alt="Payment slip preview"
                    className="mt-5 h-64 w-full rounded-2xl border border-slate-200 bg-white object-contain"
                  />
                ) : null}
              </div>

              {error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={{ pathname: `/events/${params.id}` }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
                >
                  Cancel Order
                </Link>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="surface-card overflow-hidden p-0">
            {eventImage ? (
              <img src={eventImage} alt={`${eventName} preview`} className="h-44 w-full object-cover" />
            ) : (
              <div className="h-44 w-full bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
            )}

            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Event Summary</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-primary">{eventName}</h2>

              <div className="mt-4 space-y-3 text-sm text-secondary">
                <p>{eventDate}</p>
                <p>{eventVenue}</p>
                <p>{attendees.length} attendee(s)</p>
                <p>{guests.length} guest(s)</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Reservation Status</p>
                <p className="mt-2 text-sm font-bold text-primary">Hold valid for 15 minutes</p>
              </div>
            </div>
          </section>

          <section className="surface-card p-5">
            <p className="text-sm font-black text-primary">Need Assistance?</p>
            <p className="mt-2 text-sm leading-6 text-secondary">
              Our support team is available for payment help, receipt issues, and booking confirmation questions.
            </p>

            <div className="mt-4 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">
              Contact Support
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
