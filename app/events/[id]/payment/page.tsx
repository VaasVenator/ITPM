"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const guestName = searchParams.get("guestName") ?? "";
  const guestEmail = searchParams.get("guestEmail") ?? "";
  const guestPhone = searchParams.get("guestPhone") ?? "";
  const university = searchParams.get("university") ?? "";
  const notes = searchParams.get("notes") ?? "";
  const quantity = Number(searchParams.get("quantity") ?? "1");
  const ticketPrice = Number(searchParams.get("ticketPrice") ?? "2500");

  const [paymentSlipName, setPaymentSlipName] = useState("");
  const [paymentSlipPreview, setPaymentSlipPreview] = useState("");
  const [error, setError] = useState("");

  const totalPrice = useMemo(() => {
    return ticketPrice * quantity;
  }, [ticketPrice, quantity]);

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

    setPaymentSlipName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentSlipPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!paymentSlipName) {
      setError("Please attach the payment slip before proceeding.");
      return;
    }

    router.push(`/events/${params.id}/complete`);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-lime-400" />
            <span className="text-xs font-semibold text-primary">Payment Submission</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
            <span className="h-2.5 w-8 rounded-full bg-primary" />
            <span className="h-2.5 w-8 rounded-full bg-highlight" />
          </div>

          <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-[10px] font-bold text-black">
            3
          </div>
        </div>

        <div className="px-6 py-8">
          <h1 className="text-center text-2xl font-bold text-primary">
            Payment details submission
          </h1>

          <div className="mx-auto mt-8 max-w-xl">
            <p className="mb-6 text-center text-sm font-semibold text-primary">
              Enter payment details
            </p>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">One Ticket Price</p>
                <p className="mt-2 text-sm font-bold text-primary">LKR {ticketPrice.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">Quantity</p>
                <p className="mt-2 text-sm font-bold text-primary">{quantity}</p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-highlight/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-secondary">Total Price</p>
                <p className="mt-2 text-sm font-bold text-primary">LKR {totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" value={guestName} className="input-field" readOnly />
              <input type="email" value={guestEmail} className="input-field" readOnly />
              <input type="text" value={guestPhone} className="input-field" readOnly />
              <input type="text" value={university} className="input-field" readOnly />
              <input type="text" value={String(quantity)} className="input-field" readOnly />

              <textarea value={notes} className="textarea-field" readOnly />

              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  className="input-field"
                  onChange={(e) => handleSlipChange(e.target.files?.[0] ?? null)}
                  required
                />

                {paymentSlipName ? (
                  <p className="text-sm font-medium text-primary">
                    Attached slip: {paymentSlipName}
                  </p>
                ) : null}

                {paymentSlipPreview ? (
                  <img
                    src={paymentSlipPreview}
                    alt="Payment slip preview"
                    className="h-56 w-full rounded-xl border border-slate-200 object-contain"
                  />
                ) : null}
              </div>

              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

              <div className="pt-4 text-center">
                <button
                  type="submit"
                  className="rounded-full bg-slate-200 px-6 py-2 text-sm font-semibold text-primary transition hover:bg-slate-300"
                >
                  Proceed to checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

