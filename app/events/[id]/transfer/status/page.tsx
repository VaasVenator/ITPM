"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
  eventVenue?: string;
  eventDate?: string;
  eventImage?: string;
  selectedTicket: TransferTicket;
  recipientEmail: string;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
  senderName?: string;
  senderEmail?: string;
};

function formatSriLankaDate(dateValue?: string) {
  if (!dateValue) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(dateValue));
}

function formatSriLankaTime(dateValue?: string) {
  if (!dateValue) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(dateValue));
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

function readTransfer(id: string): TransferData | null {
  const local = localStorage.getItem(`ticket-transfer-${id}`);
  const session = sessionStorage.getItem(`ticket-transfer-${id}`);
  const raw = local || session;

  if (!raw) return null;

  try {
    return JSON.parse(raw) as TransferData;
  } catch {
    return null;
  }
}

function writeTransfer(id: string, value: TransferData) {
  const raw = JSON.stringify(value);
  localStorage.setItem(`ticket-transfer-${id}`, raw);
  sessionStorage.setItem(`ticket-transfer-${id}`, raw);
}

export default function TicketTransferStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loaded, setLoaded] = useState(false);
  const [paymentData, setPaymentData] = useState<CompletionData | null>(null);
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [remainingTime, setRemainingTime] = useState("48:00:00");
  const [acceptedFromEmail, setAcceptedFromEmail] = useState(false);

  useEffect(() => {
    const storedPayment = sessionStorage.getItem(`payment-complete-${params.id}`);

    if (storedPayment) {
      try {
        setPaymentData(JSON.parse(storedPayment) as CompletionData);
      } catch {
        setPaymentData(null);
      }
    }

    const parsedTransfer = readTransfer(params.id);

    if (parsedTransfer) {
      const shouldAutoAccept = searchParams.get("accept") === "true";

      if (shouldAutoAccept && parsedTransfer.status !== "accepted") {
        const updatedTransfer: TransferData = {
          ...parsedTransfer,
          status: "accepted"
        };

        writeTransfer(params.id, updatedTransfer);
        setTransferData(updatedTransfer);
        setRemainingTime(getRemainingTime(updatedTransfer.createdAt));
        setAcceptedFromEmail(true);

        router.replace(`/events/${params.id}/transfer/status`);
      } else {
        setTransferData(parsedTransfer);
        setRemainingTime(getRemainingTime(parsedTransfer.createdAt));
      }
    } else {
      setTransferData(null);
    }

    setLoaded(true);
  }, [params.id, router, searchParams]);

  useEffect(() => {
    if (!transferData?.createdAt || transferData.status !== "pending") return;

    const timer = setInterval(() => {
      setRemainingTime(getRemainingTime(transferData.createdAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [transferData]);

  const sender = useMemo(() => {
    if (transferData?.senderName || transferData?.senderEmail) {
      return {
        name: transferData.senderName || "Ticket Owner",
        email: transferData.senderEmail || "owner@example.com"
      };
    }

    const first = paymentData?.attendees?.[0];
    return {
      name: first?.name || "Ticket Owner",
      email: first?.email || "owner@example.com"
    };
  }, [paymentData, transferData]);

  const statusText = useMemo(() => {
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

  function handleCancelTransfer() {
    localStorage.removeItem(`ticket-transfer-${params.id}`);
    sessionStorage.removeItem(`ticket-transfer-${params.id}`);
    router.push(`/events/${params.id}/history`);
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading transfer status...</p>
        </section>
      </main>
    );
  }

  if (!paymentData || !transferData) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="surface-card p-6">
          <h1 className="text-2xl font-black text-primary">Transfer Status</h1>
          <p className="mt-3 text-sm text-secondary">
            No transfer request was found for this event.
          </p>
          <div className="mt-5">
            <Link
              href={{ pathname: `/events/${params.id}/transfer` }}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to Ticket Transfer
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
            ← Back to History
          </Link>
        </div>

        {acceptedFromEmail ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-700">
              Ticket accepted successfully from the email link.
            </p>
          </section>
        ) : null}

        <header className="surface-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses}`}>
                {statusText}
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-primary">
                Ticket Transfer Status
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-secondary">
                Track the transfer request for your selected ticket and review the recipient email response.
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_18rem]">
          <section className="space-y-6">
            <section className="surface-card p-6">
              <div className="grid gap-5 md:grid-cols-[1fr_4.5rem]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Event
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-primary">
                    {transferData.eventName || paymentData.eventName}
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

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Transfer Date
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{formatSriLankaDate(transferData.createdAt)}</p>
                  <p className="mt-1 text-xs text-secondary">{formatSriLankaTime(transferData.createdAt)}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Ticket
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
                    Ticket ID
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{transferData.selectedTicket.reference}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Recipient Email
                  </p>
                  <p className="mt-2 break-all text-sm font-bold text-primary">{transferData.recipientEmail}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Sent By
                  </p>
                  <p className="mt-2 text-sm font-bold text-primary">{sender.name}</p>
                  <p className="mt-1 text-xs text-secondary">{sender.email}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Recipient
                  </p>
                  <p className="mt-2 break-all text-sm font-bold text-primary">{transferData.recipientEmail}</p>
                  <p className="mt-1 text-xs text-secondary">{statusText}</p>
                </div>
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
                    <p className="font-bold text-primary">Transfer Request Sent</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      The transfer email was sent successfully to the recipient with ticket details.
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {formatSriLankaDate(transferData.createdAt)} • {formatSriLankaTime(transferData.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div
                    className={`mt-1 h-4 w-4 rounded-full ${
                      transferData.status === "pending"
                        ? "bg-amber-400"
                        : transferData.status === "accepted"
                          ? "bg-primary"
                          : "bg-rose-400"
                    }`}
                  />
                  <div>
                    <p className="font-bold text-primary">Recipient Email Response</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      {transferData.status === "accepted"
                        ? "The recipient clicked the email link and accepted the transfer."
                        : transferData.status === "declined"
                          ? "The recipient declined the transfer after reviewing the email."
                          : `Waiting for ${transferData.recipientEmail} to respond to the transfer email.`}
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
                    <p className="font-bold text-primary">Ticket Ownership Updated</p>
                    <p className="mt-1 text-sm leading-6 text-secondary">
                      {transferData.status === "accepted"
                        ? "The ticket ownership has been updated successfully for the recipient."
                        : "This final step will complete after the recipient accepts the transfer."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Current Transfer Status</p>
              <p className="mt-3 text-sm leading-6 text-secondary">
                {transferData.status === "accepted"
                  ? `This ticket transfer has been accepted by ${transferData.recipientEmail} and completed successfully.`
                  : transferData.status === "declined"
                    ? `This ticket transfer was declined by ${transferData.recipientEmail}.`
                    : `This ticket transfer is still waiting for an email response from ${transferData.recipientEmail}.`}
              </p>
            </section>

            <section className="overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                Transfer Expiry
              </p>
              <p className="mt-3 text-4xl font-black tracking-tight">
                {transferData.status === "pending" ? remainingTime : "Closed"}
              </p>
              <p className="mt-3 text-sm text-slate-200">
                {transferData.status === "pending"
                  ? "The recipient must respond from the email before the transfer expires."
                  : "This transfer request is no longer active."}
              </p>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">What happens next?</p>
              <div className="mt-4 space-y-4 text-sm text-secondary">
                <p>1. Pending transfers remain active for 48 hours.</p>
                <p>2. Accepted transfers permanently move the ticket to the recipient.</p>
                <p>3. Declined or expired transfers keep the ticket in the sender account.</p>
              </div>
            </section>

            {transferData.status === "pending" ? (
              <button
                type="button"
                onClick={handleCancelTransfer}
                className="inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Cancel Transfer
              </button>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
