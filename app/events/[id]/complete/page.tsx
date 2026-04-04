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
};

export default function TicketPurchaseCompletionPage() {
  const params = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<CompletionData | null>(null);

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

  const firstAttendee = data?.attendees?.[0];
  const faculty = firstAttendee?.organization || "Not provided";

  const ticketLines = useMemo(() => {
    if (!data) return [];

    const lines: Array<{ label: string; qty: number; total: number }> = [];

    if (data.earlyBirdQty > 0) {
      lines.push({
        label: "Early Bird",
        qty: data.earlyBirdQty,
        total: data.earlyBirdQty * 1500
      });
    }

    if (data.standardQty > 0) {
      lines.push({
        label: "Standard Access",
        qty: data.standardQty,
        total: data.standardQty * 2500
      });
    }

    if (data.executiveVipQty > 0) {
      lines.push({
        label: "Executive VIP",
        qty: data.executiveVipQty,
        total: data.executiveVipQty * 5000
      });
    }

    return lines;
  }, [data]);

  function receiptHtml() {
    if (!data) return "";

    const ticketRows =
      ticketLines.length > 0
        ? ticketLines
            .map(
              (item) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${item.label}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">Rs. ${item.total}</td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="3" style="padding:8px 0;">No tickets available</td></tr>`;

    return `
      <html>
        <head>
          <title>Receipt PDF</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #0f172a;
            }
            .card {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
            }
            h1, h2, h3, p {
              margin: 0 0 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            .muted {
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Payment Receipt</h1>
            <p class="muted">Event: ${data.eventName}</p>
            <p class="muted">Venue: ${data.eventVenue}</p>
            <p class="muted">Date: ${data.eventDate}</p>

            <h3>Customer Details</h3>
            <p>Name: ${firstAttendee?.name || "Not available"}</p>
            <p>Email: ${firstAttendee?.email || "Not available"}</p>
            <p>Faculty: ${faculty}</p>

            <h3>Ticket Summary</h3>
            <table>
              <thead>
                <tr>
                  <th style="text-align:left;padding-bottom:8px;">Ticket Type</th>
                  <th style="text-align:center;padding-bottom:8px;">Qty</th>
                  <th style="text-align:right;padding-bottom:8px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
            </table>

            <h3 style="margin-top:20px;">Payment Details</h3>
            <p>Branch: ${data.paymentBranch}</p>
            <p>Payment Date: ${data.paymentDate}</p>
            <p><strong>Total Paid: Rs. ${data.paymentAmount}</strong></p>
          </div>
        </body>
      </html>
    `;
  }

  function handleDownloadReceiptPdf() {
    const html = receiptHtml();
    if (!html) return;

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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading completion details...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-primary md:text-5xl">
            Payment Successful
          </h1>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Your payment has been submitted successfully and is now in progress.
          </p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            After the payment is confirmed by the administration, you will receive an email with your ticket details.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="surface-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">User Name</p>
                <p className="mt-2 text-sm font-bold text-primary">{firstAttendee?.name || "Not available"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Email</p>
                <p className="mt-2 text-sm font-bold text-primary">{firstAttendee?.email || "Not available"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Faculty</p>
                <p className="mt-2 text-sm font-bold text-primary">{faculty}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Payment Date</p>
                <p className="mt-2 text-sm font-bold text-primary">{data?.paymentDate || "Not available"}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Event Details</p>

              <div className="mt-4 flex gap-4">
                {data?.eventImage ? (
                  <img
                    src={data.eventImage}
                    alt={data.eventName}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
                )}

                <div>
                  <p className="text-lg font-black text-primary">{data?.eventName || "Event"}</p>
                  <p className="mt-1 text-sm text-secondary">{data?.eventDate || "Date not available"}</p>
                  <p className="mt-1 text-sm text-secondary">{data?.eventVenue || "Venue not available"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/my-events"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View My Tickets
              </Link>

              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
              >
                Download Receipt
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
              >
                Return To Home Page
              </Link>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="surface-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Payment Summary</p>

              <div className="mt-5 space-y-3">
                {ticketLines.length > 0 ? (
                  ticketLines.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="font-semibold text-primary">{item.label}</p>
                        <p className="text-secondary">Qty: {item.qty}</p>
                      </div>
                      <p className="font-bold text-primary">Rs. {item.total}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-secondary">No ticket details available.</p>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-secondary">Payment Branch</p>
                    <p className="text-sm font-bold text-primary">{data?.paymentBranch || "Not available"}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-secondary">Total Paid</p>
                    <p className="text-4xl font-black tracking-tight text-primary">
                      Rs. {data?.paymentAmount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">Booking Status</p>
              <p className="mt-2 text-sm leading-6 text-secondary">
                Payment is currently under review. After the administrator confirms it, you will receive an email with your confirmed ticket details.
              </p>
            </section>

            <div>
              <Link
                href={{ pathname: `/events/${params.id}/history` }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                View Payment History
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}







