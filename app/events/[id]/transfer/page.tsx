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
  paymentTime?: string;
};

type TransferTicket = {
  id: string;
  label: string;
  tier: string;
  reference: string;
};

export default function TicketTransferPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<CompletionData | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

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

  const tickets = useMemo<TransferTicket[]>(() => {
    if (!data) return [];

    const items: TransferTicket[] = [];
    let counter = 1;

    const pushTickets = (count: number, label: string, tier: string) => {
      for (let i = 0; i < count; i += 1) {
        items.push({
          id: `${label.toLowerCase().replace(/\s+/g, "-")}-${counter}`,
          label,
          tier,
          reference: `NX-${params.id.toUpperCase().slice(0, 6)}-${String(counter).padStart(3, "0")}`
        });
        counter += 1;
      }
    };

    pushTickets(data.earlyBirdQty, "Early Bird", "Pass");
    pushTickets(data.standardQty, "Standard Access", "Pass");
    pushTickets(data.executiveVipQty, "VIP Access", "Pass");

    return items;
  }, [data, params.id]);

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0],
    [tickets, selectedTicketId]
  );

  async function handleSendTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!selectedTicket) {
      setError("Please select a ticket to transfer.");
      return;
    }

    if (!recipientEmail.trim()) {
      setError("Please enter the recipient email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(recipientEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    const transferPayload = {
      eventId: params.id,
      eventName: data?.eventName,
      eventVenue: data?.eventVenue,
      eventDate: data?.eventDate,
      eventImage: data?.eventImage,
      selectedTicket,
      recipientEmail: recipientEmail.trim(),
      message: message.trim(),
      senderName: data?.attendees?.[0]?.name || "Ticket Owner",
      senderEmail: data?.attendees?.[0]?.email || "owner@example.com",
      createdAt: new Date().toISOString(),
      status: "pending" as const
    };

    try {
      setSending(true);

      const response = await fetch("/api/transfer-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(transferPayload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Transfer email could not be sent.");
      }

      localStorage.setItem(
        `ticket-transfer-${params.id}`,
        JSON.stringify(transferPayload)
      );

      router.push(`/events/${params.id}/transfer/status`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Transfer email could not be sent. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <p className="text-sm text-secondary">Loading transfer details...</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="surface-card p-6">
          <h1 className="text-xl font-black text-primary">Initiate Transfer</h1>
          <p className="mt-3 text-sm text-secondary">
            No payment record was found for this event. Complete a payment first before transferring a ticket.
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
              Transfers / New Ticket Transfer
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-primary">Initiate Transfer</h1>
            <p className="mt-2 max-w-3xl text-sm text-secondary">
              Securely move your ticket ownership to another attendee. Once initiated, the recipient will receive transfer ticket information by email.
            </p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
          <section className="space-y-6">
            <section className="surface-card p-6">
              <div className="flex items-center gap-3">
                <span className="text-primary">1</span>
                <h2 className="text-lg font-black text-primary">Select Ticket</h2>
              </div>

              <form onSubmit={handleSendTransfer} className="mt-5 space-y-6">
                <div>
                  <label className="label-text">Available Tickets</label>
                  <select
                    className="input-field"
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                  >
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {data.eventName} - {ticket.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center gap-3">
                    <span className="text-primary">2</span>
                    <h2 className="text-lg font-black text-primary">Recipient Details</h2>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="label-text">Recipient's Email Address</label>
                      <input
                        type="email"
                        className="input-field"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g. attendee@company.com"
                        required
                      />
                      <p className="mt-2 text-xs text-secondary">
                        Transfer details will be sent to this email address.
                      </p>
                    </div>

                    <div>
                      <label className="label-text">Personal Note Optional</label>
                      <textarea
                        className="textarea-field"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a short message for the recipient..."
                      />
                    </div>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={{ pathname: `/events/${params.id}/history` }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {sending ? "Sending..." : "Send Transfer"}
                  </button>
                </div>
              </form>
            </section>
          </section>

          <aside className="space-y-5">
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

              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                  Selected Ticket
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-primary">
                  {data.eventName}
                </h2>
                <p className="mt-2 text-sm font-semibold text-secondary">
                  {selectedTicket?.label || "Ticket"} {selectedTicket?.tier || ""}
                </p>

                <div className="mt-5 grid gap-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-secondary">Date</span>
                    <span className="font-bold text-primary">{data.eventDate}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-secondary">Location</span>
                    <span className="font-bold text-primary">{data.eventVenue}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-secondary">Order ID</span>
                    <span className="font-bold text-primary">{selectedTicket?.reference || "N/A"}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <p className="text-sm font-black text-primary">What happens next?</p>
              <div className="mt-4 space-y-4 text-sm text-secondary">
                <p>1. The recipient receives an email with transfer ticket information.</p>
                <p>2. The transfer request is saved and marked as pending.</p>
                <p>3. After email acceptance, the status page updates automatically in the same browser.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
