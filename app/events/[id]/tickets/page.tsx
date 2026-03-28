"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function TicketPurchaseFormPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const ticketPrice = 2500;
  const availableTickets = 4;

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const totalPrice = useMemo(() => ticketPrice * quantity, [ticketPrice, quantity]);

  function handleQuantityChange(value: string) {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) {
      setQuantity(1);
      return;
    }

    if (nextValue < 1) {
      setQuantity(1);
      return;
    }

    if (nextValue > availableTickets) {
      setQuantity(availableTickets);
      return;
    }

    setQuantity(nextValue);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    if (quantity < 1 || quantity > availableTickets) {
      setError(`You can only purchase up to ${availableTickets} ticket(s).`);
      return;
    }

    const searchParams = new URLSearchParams({
      guestName,
      guestEmail,
      guestPhone,
      university,
      quantity: String(quantity),
      notes,
      ticketPrice: String(ticketPrice),
      totalPrice: String(totalPrice)
    });

    router.push(`/events/${params.id}/payment?${searchParams.toString()}`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-lime-400" />
            <span className="text-xs font-semibold text-primary">Ticket Purchase</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-primary" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
          </div>

          <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[10px] font-bold text-black">
            2
          </div>
        </div>

        <div className="px-6 py-8">
          <h1 className="text-center text-2xl font-bold text-primary">
            Ticket purchase form
          </h1>

          <div className="mx-auto mt-8 max-w-xl">
            <p className="mb-6 text-center text-sm font-semibold text-primary">
              Enter guest details
            </p>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">One Ticket Price</p>
                <p className="mt-2 text-sm font-bold text-primary">LKR {ticketPrice.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">Available Tickets</p>
                <p className="mt-2 text-sm font-bold text-primary">{availableTickets}</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-highlight/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">Total Price</p>
                <p className="mt-2 text-sm font-bold text-primary">LKR {totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="guestName"
                type="text"
                placeholder="Enter guest name"
                className="input-field"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />

              <input
                name="guestEmail"
                type="email"
                placeholder="Enter guest email"
                className="input-field"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />

              <input
                name="guestPhone"
                type="text"
                placeholder="Enter guest phone number"
                className="input-field"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />

              <input
                name="university"
                type="text"
                placeholder="Enter faculty"
                className="input-field"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
              />

              <input
                name="quantity"
                type="number"
                min={1}
                max={availableTickets}
                value={quantity}
                placeholder="Enter quantity"
                className="input-field"
                onChange={(e) => handleQuantityChange(e.target.value)}
                required
              />

              <textarea
                name="notes"
                placeholder="Enter extra notes"
                className="textarea-field"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  className="rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-primary transition hover:bg-slate-300"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}


