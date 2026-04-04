"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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
  paymentTime?: string;
};

type TransferTicket = {
  id: string;
  label: string;
  tier: string;
  reference: string;
};

type TransferData = {
  eventId: string;
  eventName?: string;
  selectedTicket: TransferTicket;
  recipientEmail: string;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
};

function getSriLankaDateTimeParts(dateValue?: string) {
  const date = dateValue ? new Date(dateValue) : new Date();

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);

  return {
    formattedDate,
    formattedTime
  };
}

function getRemainingTime(createdAt?: string) {
  if (!createdAt) return "48:00:00";

  const created = new Date(createdAt).getTime();
  const expires = created + 48 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = Math.max(0, expires - now);

  const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, "0");
  const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, "0");
  const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export default function TransferAcceptPage() {
  const params = useParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [paymentData, setPaymentData] = useState<CompletionData | null>(null);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [remainingTime, setRemainingTime] = useState("48:00:00");

  useEffect(() => {
    const storedPayment = sessionStorage.getItem(`payment-complete-${params.id}`);
    const storedTransfer = sessionStorage.getItem(`ticket-transfer-${params.id}`);

    if (storedPayment) {
      try {
        setPaymentData(JSON.parse(storedPayment) as CompletionData);
      } catch {
        setPaymentData(null);
      }
    }

    if (storedTransfer) {
      try {
        const parsed = JSON.parse(storedTransfer) as TransferData;
        setTransferData(parsed);
        setRemainingTime(getRemainingTime(parsed.createdAt));
      } catch {
        setTransferData(null);
      }
    }

    setLoaded(true);
  }, [params.id]);

  useEffect(() => {
    if (!transferData?.createdAt || transferData.status !== "pending") return;

    const timer = setInterval(() => {
      setRemainingTime(getRemainingTime(transferData.createdAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [transferData]);

  const sender = useMemo(() => {
    const first = paymentData?.attendees?.[0];
    return {
      name: first?.name || "Ticket Owner",
      email: first?.email || "owner@example.com"
    };
  }, [paymentData]);

  const transferDateParts = useMemo(() => {
    return getSriLankaDateTimeParts(paymentData?.paymentDate || transferData?.createdAt);
  }, [paymentData, transferData]);

  const statusLabel = useMemo(() => {
    if (!transferData) return "Pending Transfer";
    if (transferData.status === "accepted") return "Accepted";
    if (transferData.status === "declined") return "Declined";
    return "Pending Transfer";
  }, [transferData]);

  const statusClasses = useMemo(() => {
    if (!transferData) return "bg-amber-100 text-amber-700";
    if (transferData.status === "accepted") return "bg-highlight text-emerald-700";
    if (transferData.status === "declined") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  }, [transferData]);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading transfer details...</p>
        </section>
      </main>
    );
  }

  if (!paymentData || !transferData) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="surface-card p-6">
          <h1 className="text-2xl font-black text-primary">Ticket Transfer</h1>
          <p className="mt-3 text-sm text-secondary">
            No transfer request was found for this event.
          </p>
          <div className="mt-5">
            <Link
              href={{ pathname: `/events/${params.id}/history` }}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to History
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="space-y-6">
        <div className="px-1">
          <Link
            href={{ pathname: `/events/${params.id}/history` }}
            className="text-sm font-semibold text-secondary transition hover:text-primary"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_18rem]">
          <section className="space-y-5">
            <header className="surface-card p-6">
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses}`}>
                {statusLabel}
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-primary">
                Ticket Transfer
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
                {sender.name} is sending you a digital ticket for an upcoming event. Review the transfer details below.
              </p>
            </header>

            <section className="surface-card p-6">
              <div className="grid gap-5 md:grid-cols-[1fr_4.5rem]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Event
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-primary">
                    {paymentData.eventName}
                  </h2>
                </div>

                {paymentData.eventImage ? (
                  <img
                    src={paymentData.eventImage}
                    alt={paymentData.eventName}
                    className="h-[4.5rem] w-[4.5rem] rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-[4.5rem] w-[4.5rem] rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
                )}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Date & Time
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{transferDateParts.formattedDate}</p>
                  <p className="mt-1 text-xs text-secondary">{transferDateParts.formattedTime}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Seat / Access
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{transferData.selectedTicket.label}</p>
                  <p className="mt-1 text-xs text-secondary">{transferData.selectedTicket.tier}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{paymentData.eventVenue}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Order ID
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{transferData.selectedTicket.reference}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                  Sent By
                </p>
                <p className="mt-2 text-sm font-bold text-primary">{sender.name}</p>
                <p className="mt-1 text-xs text-secondary">{sender.email}</p>
              </div>

              {transferData.message ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Personal Note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-primary">{transferData.message}</p>
                </div>
              ) : null}
            </section>

            <section className="surface-card p-6">
              <h2 className="text-lg font-black text-primary">Transfer Timeline</h2>

              <div className="mt-5 space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 h-4 w-4 rounded-full bg-primary" />
                  <div>
                    <p className="font-bold text-primary">Transfer Created</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      The sender created the transfer request and shared the ticket with you.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div
                    className={`mt-1 h-4 w-4 rounded-full ${
                      transferData.status === "accepted"
                        ? "bg-primary"
                        : transferData.status === "declined"
                          ? "bg-rose-500"
                          : "bg-amber-400"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-primary">Recipient Decision</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      {transferData.status === "accepted"
                        ? "The ticket transfer was accepted from the email link."
                        : transferData.status === "declined"
                          ? "The transfer request was declined."
                          : "Waiting for the email acceptance to complete."}
                    </p>
                  </div>
                </div>

                <div className={`flex gap-4 ${transferData.status === "accepted" ? "" : "opacity-50"}`}>
                  <div
                    className={`mt-1 h-4 w-4 rounded-full ${
                      transferData.status === "accepted" ? "bg-primary" : "bg-slate-300"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-primary">Transfer Completed</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      {transferData.status === "accepted"
                        ? "The ticket has been moved successfully to the recipient account."
                        : "This step will complete after the email acceptance is processed."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2 px-2 text-sm font-semibold text-amber-700">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>
                {transferData.status === "pending"
                  ? `Transfer expires in ${remainingTime}`
                  : transferData.status === "accepted"
                    ? "Transfer completed successfully"
                    : "Transfer request declined"}
              </span>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="surface-card p-5">
              {transferData.status === "accepted" ? (
                <div className="rounded-xl border border-emerald-200 bg-highlight px-4 py-4 text-sm font-medium text-emerald-700">
                  Ticket accepted successfully.
                </div>
              ) : transferData.status === "declined" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
                  Ticket transfer declined.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-700">
                  Waiting for email-based acceptance.
                </div>
              )}
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Current Status</p>
              <p className="mt-3 text-sm leading-6 text-secondary">
                {transferData.status === "accepted"
                  ? "This ticket has already been accepted and transferred successfully."
                  : transferData.status === "declined"
                    ? "This transfer request has been declined and is no longer active."
                    : "This transfer is waiting for email acceptance."}
              </p>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Permanent Action</p>
              <p className="mt-3 text-sm leading-6 text-secondary">
                Once accepted, the ticket will be sent to your Nexus ID. This transfer cannot be reversed without the sender's explicit permission.
              </p>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Frequently Asked Questions</p>
              <div className="mt-4 space-y-3 text-sm text-secondary">
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  How do I access the ticket?
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  Can I transfer this to someone else?
                </div>
              </div>
            </section>

            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              Secure transfer via Nexus Event System
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
