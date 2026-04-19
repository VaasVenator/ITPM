"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type HistoryItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  amount: number;
  status: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED";
  method: string;
  reference: string;
  venue: string;
  eventImage?: string;
  note: string;
};

function buildHistoryItems(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  const items: HistoryItem[] = [];

  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key || !key.startsWith("payment-complete-")) continue;

    const raw = sessionStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as CompletionData;
      const id = key.replace("payment-complete-", "");

      items.push({
        id,
        title: parsed.eventName || "Event Payment",
        date: parsed.paymentDate || "Not available",
        time: parsed.paymentTime || "Not available",
        amount: parsed.paymentAmount ?? 0,
        status: "PENDING",
        method: "Bank Transfer",
        reference: `EP-${id.slice(0, 8).toUpperCase()}`,
        venue: parsed.eventVenue || "Venue not available",
        eventImage: parsed.eventImage || "",
        note: "Payment is being reviewed. After admin confirmation, you will receive an email."
      });
    } catch {
      // Ignore invalid storage entries.
    }
  }

  return items.reverse();
}

function statusClasses(status: HistoryItem["status"]) {
  if (status === "CONFIRMED") return "bg-sky-100 text-sky-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-slate-200 text-slate-600";
}

function statusIconClasses(status: HistoryItem["status"]) {
  if (status === "CONFIRMED") return "bg-sky-100 text-sky-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-500";
}

export default function PaymentHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const historyItems = buildHistoryItems();
    setItems(historyItems);
    if (historyItems.length > 0) {
      setSelectedId(historyItems[0].id);
    }
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId]
  );

  const monthlySpend = useMemo(() => {
    return items
      .filter((item) => item.status === "CONFIRMED" || item.status === "PENDING")
      .reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  }, [items]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="space-y-6">
        <header className="surface-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-primary">SLIIT VIBE</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-primary">History.</h1>
              <p className="mt-2 text-sm text-secondary">
                Review your complete financial activity within the event platform.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-secondary">
              <Link href="/" className="transition hover:text-primary">
                Events
              </Link>
              <Link href="/my-events" className="transition hover:text-primary">
                Tickets
              </Link>
              <span className="text-primary">History</span>
            </nav>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
          <section className="surface-card overflow-hidden p-0">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
              <p>Transaction & Date</p>
              <p>Status</p>
              <p className="text-right">Amount</p>
            </div>

            <div className="divide-y divide-slate-200">
              {items.length > 0 ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`grid w-full grid-cols-[1.2fr_0.7fr_0.7fr] items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${
                      selectedItem?.id === item.id ? "bg-slate-50/80" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${statusIconClasses(item.status)}`}
                      >
                        {item.status === "CONFIRMED"
                          ? "✓"
                          : item.status === "PENDING"
                            ? "…"
                            : item.status === "FAILED"
                              ? "!"
                              : "↺"}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{item.title}</p>
                        <p className="text-sm text-secondary">
                          {item.date} • {item.time} LK
                        </p>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-right text-lg font-black text-primary">Rs. {item.amount}</p>
                  </button>
                ))
              ) : (
                <div className="px-5 py-10 text-sm text-secondary">
                  No payment history yet. Complete a payment to see entries here.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Transaction Detail
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-primary">
                    {selectedItem?.title || "No transaction selected"}
                  </h2>
                </div>
                <div className="text-sm text-secondary">🖨</div>
              </div>

              {selectedItem ? (
                <>
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                      {selectedItem.status === "FAILED"
                        ? "Payment Failed"
                        : selectedItem.status === "PENDING"
                          ? "Payment In Progress"
                          : "Payment Note"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-rose-700">
                      {selectedItem.note}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Amount
                      </p>
                      <p className="mt-2 text-xl font-black text-primary">Rs. {selectedItem.amount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Method
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary">{selectedItem.method}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Reference
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary">{selectedItem.reference}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        Sri Lankan Time
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary">
                        {selectedItem.date} • {selectedItem.time} LK
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Link
                      href={{ pathname: `/events/${selectedItem.id}/refund` }}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Refund
                    </Link>

                    <Link
                      href={{ pathname: `/events/${selectedItem.id}/transfer` }}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                    >
                      Ticket Transfer
                    </Link>

                    <Link
                      href={{ pathname: `/events/${selectedItem.id}` }}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
                    >
                      View Event Details
                    </Link>
                  </div>
                </>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                Monthly Spend
              </p>
              <p className="mt-3 text-4xl font-black tracking-tight">Rs. {monthlySpend.toFixed(2)}</p>
              <div className="mt-5 h-2 rounded-full bg-white/15">
                <div className="h-2 w-3/4 rounded-full bg-white" />
              </div>
              <p className="mt-3 text-xs text-slate-200">67% of monthly event budget used</p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
