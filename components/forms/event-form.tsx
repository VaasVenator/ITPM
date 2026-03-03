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
  const [formError, setFormError] = useState("");

  const customFields = useMemo(() => CATEGORY_FIELDS[category], [category]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") || "");

    if (name.length < 2) {
      setFormError("Event name is required.");
      return;
    }

    const payload = {
      name,
      category,
      date: String(formData.get("date") || ""),
      location: String(formData.get("location") || ""),
      description: String(formData.get("description") || ""),
      ticketRequired,
      customFields: Object.fromEntries(
        customFields.map((label) => [label, String(formData.get(label) || "")])
      )
    };

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
      setFormError(data?.error ?? "Submission failed. Please check fields.");
      return;
    }

    window.location.href = "/my-events";
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
      <input className="input-field" type="datetime-local" name="date" required />
      <input className="input-field" name="location" placeholder="Location" required />
      <textarea className="textarea-field" name="description" placeholder="Description" />

      <div className="rounded-2xl border border-emerald-100 bg-highlight/50 p-4">
        <p className="mb-3 text-sm font-semibold text-primary">Category-specific details</p>
        {customFields.map((field) => (
          <input key={field} className="input-field mb-2" name={field} placeholder={field} required />
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-primary">
        <input className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-emerald-200" type="checkbox" checked={ticketRequired} onChange={(e) => setTicketRequired(e.target.checked)} />
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
