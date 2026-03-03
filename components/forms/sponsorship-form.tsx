"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SponsorRow = {
  type: "GOLD" | "SILVER" | "PARTNER";
  brandName: string;
  email: string;
};

const SPONSOR_PACKAGE_LABELS: Record<SponsorRow["type"], string> = {
  GOLD: "Title Sponsor (Premium)",
  SILVER: "Associate Sponsor",
  PARTNER: "Community Partner"
};

export function SponsorshipForm({ eventId }: { eventId: string }) {
  const [sponsors, setSponsors] = useState<SponsorRow[]>([
    { type: "GOLD", brandName: "", email: "" }
  ]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  function updateRow(index: number, key: keyof SponsorRow, value: string) {
    const next = [...sponsors];
    next[index] = { ...next[index], [key]: value } as SponsorRow;
    setSponsors(next);
  }

  function addRow(type: SponsorRow["type"]) {
    setSponsors((prev) => [...prev, { type, brandName: "", email: "" }]);
  }

  function removeRow(index: number) {
    setSponsors((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setWarning("");

    const valid = sponsors.every((s) => s.brandName.trim() && s.email.includes("@"));
    if (!valid) {
      setError("Each sponsor needs brand and email.");
      return;
    }

    const res = await fetch("/api/sponsorship/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, sponsors })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error ?? "Failed to submit sponsorship request.");
      return;
    }

    if (data?.warning) {
      const details = Array.isArray(data.details) ? ` (${data.details.join(" | ")})` : "";
      setWarning(`${data.warning}${details}`);
      return;
    }

    window.alert("Submission was successful and the emails have been successfully sent to the brands.");
    window.location.href = "/my-events";
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {sponsors.map((s, i) => (
        <div key={`${s.type}-${i}`} className="rounded-2xl border border-emerald-100 bg-highlight/50 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Sponsor #{i + 1}</p>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={sponsors.length === 1}
              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
          <select className="select-field mb-2" value={s.type} onChange={(e) => updateRow(i, "type", e.target.value)}>
            <option value="GOLD">{SPONSOR_PACKAGE_LABELS.GOLD}</option>
            <option value="SILVER">{SPONSOR_PACKAGE_LABELS.SILVER}</option>
            <option value="PARTNER">{SPONSOR_PACKAGE_LABELS.PARTNER}</option>
          </select>
          <input className="input-field mb-2" placeholder="Brand name" value={s.brandName} onChange={(e) => updateRow(i, "brandName", e.target.value)} required />
          <input className="input-field" type="email" placeholder="Email" value={s.email} onChange={(e) => updateRow(i, "email", e.target.value)} required />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => addRow("GOLD")}>+ Title Sponsor</Button>
        <Button type="button" variant="secondary" onClick={() => addRow("SILVER")}>+ Associate Sponsor</Button>
        <Button type="button" variant="secondary" onClick={() => addRow("PARTNER")}>+ Community Partner</Button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {warning ? <p className="text-sm text-amber-700">{warning}</p> : null}
      <Button type="submit">Send sponsorship emails</Button>
    </form>
  );
}
