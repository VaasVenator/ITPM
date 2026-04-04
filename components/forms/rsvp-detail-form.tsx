"use client";

import Link from "next/link";
import { useState } from "react";

type Attendee = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
};

type Guest = {
  id: string;
  name: string;
  email: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function RSVPDetailForm({
  eventId,
  eventName,
  eventVenue,
  eventImage,
  eventDate,
  nextStep,
  currentUserName,
  currentUserEmail
}: {
  eventId: string;
  eventName: string;
  eventVenue: string;
  eventImage?: string | null;
  eventDate: string;
  nextStep: "payment" | "tickets" | "event";
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      id: makeId("attendee"),
      fullName: currentUserName ?? "",
      email: currentUserEmail ?? "",
      phone: "",
      organization: ""
    }
  ]);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateAttendee(id: string, field: keyof Attendee, value: string) {
    setAttendees((current) =>
      current.map((attendee) =>
        attendee.id === id ? { ...attendee, [field]: value } : attendee
      )
    );
  }

  function updateGuest(id: string, field: keyof Guest, value: string) {
    setGuests((current) =>
      current.map((guest) => (guest.id === id ? { ...guest, [field]: value } : guest))
    );
  }

  function addAttendee() {
    if (attendees.length >= 5) {
      setError("You can add up to 5 attendees only.");
      return;
    }

    setError("");
    setAttendees((current) => [
      ...current,
      {
        id: makeId("attendee"),
        fullName: "",
        email: "",
        phone: "",
        organization: ""
      }
    ]);
  }

  function removeAttendee(id: string) {
    if (attendees.length === 1) {
      setError("At least one attendee is required.");
      return;
    }

    setError("");
    setAttendees((current) => current.filter((attendee) => attendee.id !== id));
  }

  function addGuest() {
    if (guests.length >= 3) {
      setError("You can add up to 3 guests only.");
      return;
    }

    setError("");
    setGuests((current) => [
      ...current,
      {
        id: makeId("guest"),
        name: "",
        email: ""
      }
    ]);
  }

  function removeGuest(id: string) {
    setError("");
    setGuests((current) => current.filter((guest) => guest.id !== id));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const hasInvalidAttendee = attendees.some(
      (attendee) => !attendee.fullName.trim() || !attendee.email.trim()
    );

    if (hasInvalidAttendee) {
      setError("Each attendee must have a full name and email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, voteType: "RSVP" })
      });

      if (res.status === 401) {
        window.location.href = `/login?redirect=/events/${eventId}/rsvp`;
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Unable to complete RSVP.");
        return;
      }

      const payload = {
        eventId,
        eventName,
        eventVenue,
        eventImage: eventImage ?? "",
        eventDate,
        attendees: attendees.map((attendee) => ({
          name: attendee.fullName,
          email: attendee.email,
          phone: attendee.phone,
          organization: attendee.organization
        })),
        guests: guests
          .filter((guest) => guest.name.trim() || guest.email.trim())
          .map((guest) => ({
            name: guest.name,
            email: guest.email
          })),
        earlyBirdQty: 0,
        standardQty: 1,
        guestQty: 0
      };

      sessionStorage.setItem(`rsvp-payment-${eventId}`, JSON.stringify(payload));

      if (nextStep === "payment") {
        window.location.href = `/events/${eventId}/payment`;
        return;
      }

      if (nextStep === "tickets") {
        window.location.href = `/events/${eventId}/tickets`;
        return;
      }

      window.location.href = `/events/${eventId}`;
    } catch {
      setError("Network error while submitting RSVP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary md:text-4xl">
            Complete Your RSVP
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Please provide the necessary details to secure your registration for this event.
          </p>
        </div>

        <section className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-primary">Attendee Details</h2>
            <button
              type="button"
              onClick={addAttendee}
              className="rounded-xl border border-emerald-200 bg-highlight px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              + Add Attendee
            </button>
          </div>

          <p className="mt-2 text-sm text-secondary">You can add up to 5 attendees.</p>

          <div className="mt-5 space-y-5">
            {attendees.map((attendee, index) => (
              <div key={attendee.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-primary">Attendee {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeAttendee(attendee.id)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete Attendee
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-text">Full Name</label>
                    <input
                      className="input-field"
                      value={attendee.fullName}
                      onChange={(e) => updateAttendee(attendee.id, "fullName", e.target.value)}
                      placeholder="e.g. Alex Sterling"
                    />
                  </div>
                  <div>
                    <label className="label-text">Email Address</label>
                    <input
                      className="input-field"
                      type="email"
                      value={attendee.email}
                      onChange={(e) => updateAttendee(attendee.id, "email", e.target.value)}
                      placeholder="alex@email.com"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-text">Phone Number</label>
                    <input
                      className="input-field"
                      value={attendee.phone}
                      onChange={(e) => updateAttendee(attendee.id, "phone", e.target.value)}
                      placeholder="+94 555 000 000"
                    />
                  </div>
                  <div>
                    <label className="label-text">Faculty</label>
                    <input
                      className="input-field"
                      value={attendee.organization}
                      onChange={(e) => updateAttendee(attendee.id, "organization", e.target.value)}
                      placeholder="faculy of computing"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-primary">Guest Details</h2>
            <button
              type="button"
              onClick={addGuest}
              className="rounded-xl border border-emerald-200 bg-highlight px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              + Add Guest
            </button>
          </div>

          <p className="mt-2 text-sm text-secondary">You can add up to 3 guests.</p>

          <div className="mt-5 space-y-4">
            {guests.length > 0 ? (
              guests.map((guest, index) => (
                <div
                  key={guest.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <label className="label-text">Guest {index + 1} Name</label>
                    <input
                      className="input-field"
                      value={guest.name}
                      onChange={(e) => updateGuest(guest.id, "name", e.target.value)}
                      placeholder="Enter guest name"
                    />
                  </div>
                  <div>
                    <label className="label-text">Email (Optional)</label>
                    <input
                      className="input-field"
                      value={guest.email}
                      onChange={(e) => updateGuest(guest.id, "email", e.target.value)}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeGuest(guest.id)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete Guest
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-secondary">
                No guests added yet.
              </div>
            )}
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Confirm RSVP"}
          </button>

          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-slate-50"
          >
            Back to Event
          </Link>
        </div>
      </form>

      <aside className="space-y-5">
        <section className="surface-card overflow-hidden p-0">
          {eventImage ? (
            <img src={eventImage} alt={`${eventName} poster`} className="h-36 w-full object-cover" />
          ) : (
            <div className="h-36 w-full bg-gradient-to-br from-slate-900 via-slate-700 to-emerald-500" />
          )}
          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Official RSVP</p>
            <h3 className="mt-2 text-xl font-black text-primary">{eventName}</h3>

            <div className="mt-4 space-y-3 text-sm text-secondary">
              <div className="flex items-center justify-between gap-3">
                <span>Reservation Status</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Pending
                </span>
              </div>
              <p>{eventDate}</p>
              <p>{eventVenue}</p>
            </div>
          </div>
        </section>

        <section className="surface-card p-5">
          <p className="text-sm font-black text-primary">Need Assistance?</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Contact our campus team for group booking or accessibility requests.
          </p>
          {nextStep === "payment" ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              After confirming RSVP, you will continue to payment details.
            </p>
          ) : null}
        </section>
      </aside>
    </section>
  );
}




