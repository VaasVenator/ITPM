"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EventCategory } from "@/types";

const CATEGORY_FIELDS: Record<EventCategory, string[]> = {
  SPORTS: ["Team Size", "Equipment Needed"],
  MUSICAL: ["Genre", "Performers Count"],
  WORKSHOPS: ["Topic", "Resource Needs"],
  EXHIBITIONS: ["Theme", "Display Setup"],
  CULTURAL: ["Tradition Focus", "Participants"],
  RELIGIOUS: ["Ritual Type", "Guidelines"]
};

const CATEGORY_META: Record<
  EventCategory,
  {
    label: string;
    hint: string;
    accent: string;
  }
> = {
  SPORTS: {
    label: "Sports",
    hint: "Competition, teams, fixtures, and crowd energy.",
    accent: "from-emerald-500/20 to-white"
  },
  MUSICAL: {
    label: "Musical",
    hint: "Performers, sound setup, genre, and stage atmosphere.",
    accent: "from-sky-500/20 to-white"
  },
  WORKSHOPS: {
    label: "Workshops",
    hint: "Structured learning, resources, and practical sessions.",
    accent: "from-amber-400/20 to-white"
  },
  EXHIBITIONS: {
    label: "Exhibitions",
    hint: "Curated display, installation requirements, and audience flow.",
    accent: "from-slate-400/20 to-white"
  },
  CULTURAL: {
    label: "Cultural",
    hint: "Traditions, performances, costumes, and celebration.",
    accent: "from-rose-400/20 to-white"
  },
  RELIGIOUS: {
    label: "Religious",
    hint: "Meaningful gatherings with respect, rituals, and guidance.",
    accent: "from-teal-500/20 to-white"
  }
};

function FieldShell({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-text">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-secondary">{hint}</p> : null}
    </div>
  );
}

export function EventForm() {
  const [category, setCategory] = useState<EventCategory>("SPORTS");
  const [ticketRequired, setTicketRequired] = useState(false);
  const [eventImage, setEventImage] = useState("");
  const [formError, setFormError] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const customFields = useMemo(() => CATEGORY_FIELDS[category], [category]);
  const categoryMeta = CATEGORY_META[category];

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Event picture must be an image file.");
      return;
    }
    if (file.size > 500 * 1024) {
      setFormError("Event picture must be less than 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEventImage(typeof reader.result === "string" ? reader.result : "");
      setFormError("");
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") || "");

    if (name.length < 2) {
      setFormError("Event name is required.");
      return;
    }

    const categoryFieldValues = Object.fromEntries(
      customFields.map((label) => [label, String(formData.get(label) || "")])
    );

    const ticketRequiredValue = formData.get("ticketRequired") === "on";
    const ticketPrice = String(formData.get("ticketPrice") || "").trim();
    const ticketQty = String(formData.get("ticketQty") || "").trim();
    const selectedDate = String(formData.get("eventDate") || "");

    if (ticketRequiredValue && (!ticketPrice || Number(ticketPrice) <= 0)) {
      setFormError("Ticket price must be greater than 0.");
      return;
    }

    if (selectedDate < today) {
      setFormError("Event date cannot be in the past.");
      return;
    }

    const payload = {
      name,
      category,
      date: (() => {
        const eventTime = String(formData.get("eventTime") || "");
        const combined = new Date(`${selectedDate}T${eventTime}`);
        return Number.isNaN(combined.getTime()) ? "" : combined.toISOString();
      })(),
      location: String(formData.get("location") || ""),
      description: String(formData.get("description") || ""),
      eventImage: eventImage || undefined,
      ticketRequired: ticketRequiredValue,
      customFields: {
        ...categoryFieldValues,
        ...(ticketRequiredValue ? { ticketPrice, ticketQty, "Ticket Price": ticketPrice } : {})
      }
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const details = data?.debug ? ` (${data.debug})` : "";
        setFormError(`${data?.error ?? "Submission failed. Please check fields."}${details}`);
        return;
      }

      window.alert("Event details submitted successfully. The authorities will review your event details soon.");
      window.location.href = "/";
    } catch {
      setFormError("Network error while submitting event. Try again.");
    }
  }

  function onClear(e: React.FormEvent<HTMLFormElement>) {
    e.currentTarget.reset();
    setCategory("SPORTS");
    setTicketRequired(false);
    setEventImage("");
    setFormError("");
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit} onReset={onClear}>
      <section className="space-y-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Step 1</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary"> Select Event Category</h2>
            </div>
            <div className="rounded-full border border-emerald-200 bg-highlight px-3 py-1 text-xs font-semibold text-emerald-700">
              {categoryMeta.label}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(CATEGORY_META) as EventCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = category === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? `border-transparent bg-gradient-to-br ${meta.accent} shadow-sm ring-2 ring-emerald-200`
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                  }`}
                >
                  <p className="text-sm font-bold text-primary">{meta.label}</p>
                  <p className="mt-2 text-xs leading-5 text-secondary">{meta.hint}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4">
            <FieldShell label="Event Name" hint="Use a title students will recognize instantly.">
              <input className="input-field" name="name" placeholder="SLIIT Cricket Bash 2026" required />
            </FieldShell>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Event Date">
                <input className="input-field" type="date" name="eventDate" min={today} required />
              </FieldShell>

              <FieldShell label="Event Time">
                <input className="input-field" type="time" name="eventTime" required />
              </FieldShell>
            </div>

            <FieldShell label="Location" hint="Venue, hall, ground, or auditorium name.">
              <input className="input-field" name="location" placeholder="SLIIT Main Grounds" required />
            </FieldShell>

            <FieldShell label="Description" hint="Give students a clear sense of what makes this event worth attending.">
              <textarea
                className="textarea-field"
                name="description"
                placeholder="Tell the story of the event, what to expect, and why students should care."
              />
            </FieldShell>
          </div>
        </div>

        <div className={`rounded-[1.75rem] border border-slate-200 bg-gradient-to-br ${categoryMeta.accent} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Step 2</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">Category Profile</h2>
          <p className="mt-2 text-sm text-secondary">{categoryMeta.hint}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {customFields.map((field) => (
              <FieldShell key={field} label={field}>
                <input className="input-field" name={field} placeholder={field} required />
              </FieldShell>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Step 3</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">Visual Identity</h2>
          <p className="mt-2 text-sm text-secondary">
            Upload the main poster, artist visual, or promotional image that represents the event. Optional.
          </p>

          <div className="mt-5 rounded-2xl border border-dashed border-emerald-300 bg-white p-4">
            <FieldShell label="Event Picture" hint="Optional. PNG or JPG, up to 500KB.">
              <input
                className="input-field"
                type="file"
                accept="image/*"
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
            </FieldShell>

            {eventImage ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img src={eventImage} alt="Event preview" className="h-56 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm font-medium text-secondary">
                No preview available
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Step 4</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary">Access & Tickets</h2>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-primary">
              <input
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-emerald-200"
                type="checkbox"
                name="ticketRequired"
                checked={ticketRequired}
                onChange={(e) => setTicketRequired(e.target.checked)}
              />
              Ticket required
            </label>
          </div>

          <p className="mt-2 text-sm text-secondary">
            Decide whether students enter freely through RSVP or through verified ticket submissions.
          </p>

          {ticketRequired ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FieldShell label="Ticket Price (LKR)">
                <input className="input-field" name="ticketPrice" type="number" min="0" step="0.01" placeholder="1000.00" required />
              </FieldShell>

              <FieldShell label="Ticket Quantity">
                <input className="input-field" name="ticketQty" type="number" min="1" placeholder="250" required />
              </FieldShell>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-highlight/60 p-4 text-sm text-primary">
              This event will accept RSVP participation without ticket payment.
            </div>
          )}
        </div>
      </section>

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{formError}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4">
        <p className="max-w-2xl text-sm text-secondary">
          Once submitted, the authorities will review your event details before the event can move to publishing or sponsorship.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="reset"
            variant="secondary"
            style={{ backgroundColor: "var(--delete)" }}
            className="bg-[var(--delete)] px-6 py-3 text-sm text-white hover:bg-red-600 focus:ring-red-100"
          >
            Clear
          </Button>
          <Button type="submit" className="px-6 py-3 text-sm">
            Submit for Approval
          </Button>
        </div>
      </div>
    </form>
  );
}
