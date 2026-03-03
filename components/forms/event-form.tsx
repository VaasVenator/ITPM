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

export function EventForm() {
  const [category, setCategory] = useState<EventCategory>("SPORTS");
  const [ticketRequired, setTicketRequired] = useState(false);
  const [eventImage, setEventImage] = useState("");
  const [formError, setFormError] = useState("");

  const customFields = useMemo(() => CATEGORY_FIELDS[category], [category]);

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

    if (!eventImage) {
      setFormError("Event image is required.");
      return;
    }

    const categoryFieldValues = Object.fromEntries(
      customFields.map((label) => [label, String(formData.get(label) || "")])
    );

    const ticketRequiredValue = formData.get("ticketRequired") === "on";
    const ticketPrice = String(formData.get("ticketPrice") || "").trim();
    const ticketQty = String(formData.get("ticketQty") || "").trim();

    if (ticketRequiredValue && (!ticketPrice || Number(ticketPrice) <= 0)) {
      setFormError("Ticket price must be greater than 0.");
      return;
    }

    const payload = {
      name,
      category,
      date: (() => {
        const eventDate = String(formData.get("eventDate") || "");
        const eventTime = String(formData.get("eventTime") || "");
        const combined = new Date(`${eventDate}T${eventTime}`);
        return Number.isNaN(combined.getTime()) ? "" : combined.toISOString();
      })(),
      location: String(formData.get("location") || ""),
      description: String(formData.get("description") || ""),
      eventImage,
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

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="label-text">Category</label>
        <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
          {Object.keys(CATEGORY_FIELDS).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <input className="input-field" name="name" placeholder="Event name" required />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label-text">Event Date</label>
          <input className="input-field" type="date" name="eventDate" required />
        </div>
        <div>
          <label className="label-text">Event Time</label>
          <input className="input-field" type="time" name="eventTime" required />
        </div>
      </div>
      <input className="input-field" name="location" placeholder="Location" required />
      <textarea className="textarea-field" name="description" placeholder="Description" />

      <div>
        <label className="label-text">Event Picture (Required)</label>
        <input
          className="input-field"
          type="file"
          accept="image/*"
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
          required
        />
        {eventImage ? (
          <div className="mt-2">
            <img src={eventImage} alt="Event preview" className="h-40 w-full rounded-xl object-cover" />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-highlight/50 p-4">
        <p className="mb-3 text-sm font-semibold text-primary">Category-specific details</p>
        {customFields.map((field) => (
          <input key={field} className="input-field mb-2" name={field} placeholder={field} required />
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-primary">
        <input
          className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-emerald-200"
          type="checkbox"
          name="ticketRequired"
          checked={ticketRequired}
          onChange={(e) => setTicketRequired(e.target.checked)}
        />
        Ticket required
      </label>

      {ticketRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-primary">Ticket details</p>
          <input className="input-field mb-2" name="ticketPrice" type="number" min="0" step="0.01" placeholder="Ticket price" required />
          <input className="input-field" name="ticketQty" type="number" min="1" placeholder="Ticket quantity" required />
        </div>
      ) : null}

      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
      <Button type="submit">Submit for approval</Button>
    </form>
  );
}
