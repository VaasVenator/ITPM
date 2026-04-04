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

type RefundTicket = {
  id: string;
  label: string;
  tier?: string;
  reference: string;
  price: number;
  refundable: boolean;
};

type RefundRequestData = {
  eventId: string;
  eventName?: string;
  reason: string;
  notes: string;
  tickets: RefundTicket[];
  subtotal: number;
  serviceFee: number;
  cancellationFee: number;
  estimatedRefund: number;
  requestedAt: string;
};

function money(value: number) {
  return `Rs. ${value.toFixed(2)}`;
}

function formatReason(reason: string) {
  if (reason === "change-of-plans") return "Change of Plans";
  if (reason === "emergency") return "Emergency";
  if (reason === "dissatisfied") return "Dissatisfied";
  return reason;
}

export default function RefundStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [paymentData, setPaymentData] = useState<CompletionData | null>(null);
  const [refundData, setRefundData] = useState<RefundRequestData | null>(null);

  useEffect(() => {
    const storedPayment = sessionStorage.getItem(`payment-complete-${params.id}`);
    const storedRefund = sessionStorage.getItem(`refund-request-${params.id}`);

    if (storedPayment) {
      try {
        setPaymentData(JSON.parse(storedPayment) as CompletionData);
      } catch {
        setPaymentData(null);
      }
    }

    if (storedRefund) {
      try {
        setRefundData(JSON.parse(storedRefund) as RefundRequestData);
      } catch {
        setRefundData(null);
      }
    }

    setLoaded(true);
  }, [params.id]);

  const requestDate = useMemo(() => {
    if (!refundData?.requestedAt) return "Not available";
    const date = new Date(refundData.requestedAt);
    return date.toLocaleDateString("en-LK", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  }, [refundData]);

  const requestId = useMemo(() => {
    return `RQS-${params.id.toUpperCase().slice(0, 6)}-REQ`;
  }, [params.id]);

  const estimatedCompletion = useMemo(() => {
    if (!refundData?.requestedAt) return "Not available";
    const date = new Date(refundData.requestedAt);
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString("en-LK", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  }, [refundData]);

  const originalTicketTotal = useMemo(() => {
    return refundData?.subtotal ?? 0;
  }, [refundData]);

  const processingFeeApplied = useMemo(() => {
    if (!refundData) return 0;
    return refundData.serviceFee + refundData.cancellationFee;
  }, [refundData]);

  const selectedTicketNames = useMemo(() => {
    if (!refundData?.tickets?.length) return "Not available";
    return refundData.tickets
      .map((ticket) => `${ticket.label}${ticket.tier ? ` (${ticket.tier})` : ""}`)
      .join(", ");
  }, [refundData]);

  function handleWithdrawRequest() {
    sessionStorage.removeItem(`refund-request-${params.id}`);
    router.push(`/events/${params.id}/history`);
  }

  function handleDownloadReceiptPdf() {
    if (!refundData || !paymentData) return;

    const html = `
      <html>
        <head>
          <title>Refund Request Status</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #0f172a;
            }
            .card {
              max-width: 820px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
            }
            h1, h2, h3, p {
              margin: 0 0 12px;
            }
            .muted {
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            td, th {
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
            }
            th:last-child, td:last-child {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Refund Request Status</h1>
            <p class="muted">Request ID: ${requestId}</p>
            <p class="muted">Event: ${paymentData.eventName}</p>
            <p class="muted">Event Date: ${paymentData.eventDate}</p>
            <p class="muted">Status: Under Review</p>
            <p class="muted">Estimated Completion: ${estimatedCompletion}</p>

            <h3>Refunded Tickets</h3>
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${refundData.tickets
                  .map(
                    (ticket) => `
                      <tr>
                        <td>${ticket.label}${ticket.tier ? ` (${ticket.tier})` : ""}</td>
                        <td>${money(ticket.price)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>

            <h3 style="margin-top:20px;">Refund Summary</h3>
            <p>Original Ticket Price: ${money(originalTicketTotal)}</p>
            <p>Processing Fee Applied: -${money(processingFeeApplied)}</p>
            <p><strong>Projected Refund Amount: ${money(refundData.estimatedRefund)}</strong></p>

            <h3 style="margin-top:20px;">Original Submission Details</h3>
            <p>Reason for Refund: ${formatReason(refundData.reason)}</p>
            <p>Notes: ${refundData.notes || "No additional notes provided."}</p>
          </div>
        </body>
      </html>
    `;

    const receiptWindow = window.open("", "_blank", "width=900,height=700");
    if (!receiptWindow) return;

    receiptWindow.document.open();
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading refund request status...</p>
        </section>
      </main>
    );
  }

  if (!paymentData || !refundData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <h1 className="text-xl font-black text-primary">Refund Request Status</h1>
          <p className="mt-3 text-sm text-secondary">
            No refund request was found for this event. Please submit a refund request first.
          </p>
          <div className="mt-5">
            <Link
              href={{ pathname: `/events/${params.id}/refund` }}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to Refund Request
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
                 Refund Request Status
              </h1>
              <p className="mt-2 text-sm text-secondary">
                Request ID: {requestId} • Ticket for "{paymentData.eventName}"
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
                Reports
              </Link>
            </nav>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-6">
            <section className="surface-card p-6">
              <div className="grid gap-6 md:grid-cols-[1fr_12rem]">
                <div>
                  <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Current Status
                      </p>
                      <p className="mt-2 text-2xl font-black text-primary">Under Review</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Estimated Completion
                      </p>
                      <p className="mt-2 text-lg font-bold text-primary">{estimatedCompletion}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    <div className="flex gap-4">
                      <div className="mt-1 h-4 w-4 rounded-full bg-primary" />
                      <div>
                        <p className="font-bold text-primary">Request Submitted</p>
                        <p className="mt-1 text-sm leading-6 text-secondary">
                          Your refund request was successfully filed and received.
                        </p>
                        <p className="mt-1 text-xs text-secondary">{requestDate}</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="mt-1 h-4 w-4 rounded-full bg-primary" />
                      <div>
                        <p className="font-bold text-primary">Validation Complete</p>
                        <p className="mt-1 text-sm leading-6 text-secondary">
                          The event policy check has been confirmed against your selected tickets.
                        </p>
                        <p className="mt-1 text-xs text-secondary">{requestDate}</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="mt-1 h-4 w-4 rounded-full bg-amber-400" />
                      <div>
                        <p className="font-bold text-primary">Agent Review</p>
                        <p className="mt-1 text-sm leading-6 text-secondary">
                          A logistics manager is currently reviewing your refund request.
                        </p>
                        <p className="mt-1 text-xs text-secondary">In Progress</p>
                      </div>
                    </div>

                    <div className="flex gap-4 opacity-50">
                      <div className="mt-1 h-4 w-4 rounded-full bg-slate-300" />
                      <div>
                        <p className="font-bold text-primary">Final Decision</p>
                        <p className="mt-1 text-sm leading-6 text-secondary">
                          Final approval and refund disbursement status.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-primary p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Projected Refund Amount
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {money(refundData.estimatedRefund)}
                  </p>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-200">Original Ticket Price</span>
                      <span>{money(originalTicketTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-200">Processing Fee Applied</span>
                      <span>-{money(processingFeeApplied)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-card p-6">
              <h2 className="text-lg font-black text-primary">Original Submission Details</h2>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Reason for Refund
                  </p>
                  <p className="mt-2 text-sm leading-6 text-primary">
                    {refundData.notes || formatReason(refundData.reason)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      Event Date
                    </p>
                    <p className="mt-2 text-sm font-bold text-primary">{paymentData.eventDate}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                      Ticket Type
                    </p>
                    <p className="mt-2 text-sm font-bold text-primary">{selectedTicketNames}</p>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Note from Logistics Team</p>
              <p className="mt-3 text-sm leading-6 text-secondary">
                We have received your refund certificate. Our team is verifying the authenticity with
                the provider. Once confirmed, the refund will be processed within 3 to 5 business days.
              </p>
            </section>

            <button
              type="button"
              onClick={handleDownloadReceiptPdf}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
            >
              Download Receipt PDF
            </button>

            <button
              type="button"
              onClick={handleWithdrawRequest}
              className="inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              Withdraw Request
            </button>

            <p className="text-center text-[11px] uppercase tracking-[0.18em] text-secondary">
              Withdrawals are permanent and cannot be undone at this stage.
            </p>

            <section className="overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-sm">
              <p className="text-sm font-black">Need immediate help?</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Priority concierge is available for Elite Members.
              </p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                Contact Concierge
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
