"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SponsorRow = {
  type: "GOLD" | "SILVER" | "PARTNER";
  brandName: string;
  email: string;
};

export function SponsorshipForm({ eventId }: { eventId: string }) {
  const [title, setTitle] = useState("");
  const [sponsors, setSponsors] = useState<SponsorRow[]>([
    { type: "GOLD", brandName: "", email: "" }
  ]);
  const [error, setError] = useState("");

  function updateRow(index: number, key: keyof SponsorRow, value: string) {
    const next = [...sponsors];
    next[index] = { ...next[index], [key]: value } as SponsorRow;
    setSponsors(next);
  }

  function addRow(type: SponsorRow["type"]) {
    setSponsors((prev) => [...prev, { type, brandName: "", email: "" }]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const valid = sponsors.every((s) => s.brandName.trim() && s.email.includes("@"));
    if (!valid) {
      setError("Each sponsor needs brand and email.");
      return;
    }

    const res = await fetch("/api/sponsorship/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, title, sponsors })
    });

    if (!res.ok) {
      setError("Failed to submit sponsorship request.");
      return;
    }

    window.location.href = "/my-events";
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <input className="input-field" placeholder="Sponsorship title" value={title} onChange={(e) => setTitle(e.target.value)} required />

      {sponsors.map((s, i) => (
        <div key={`${s.type}-${i}`} className="rounded-2xl border border-emerald-100 bg-highlight/50 p-4">
          <select className="select-field mb-2" value={s.type} onChange={(e) => updateRow(i, "type", e.target.value)}>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
            <option value="PARTNER">Partner</option>
          </select>
          <input className="input-field mb-2" placeholder="Brand name" value={s.brandName} onChange={(e) => updateRow(i, "brandName", e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={s.email} onChange={(e) => updateRow(i, "email", e.target.value)} required />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => addRow("GOLD")}>+ Gold</Button>
        <Button type="button" variant="secondary" onClick={() => addRow("SILVER")}>+ Silver</Button>
        <Button type="button" variant="secondary" onClick={() => addRow("PARTNER")}>+ Partner</Button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit">Send sponsorship emails</Button>
    </form>
  );
}
