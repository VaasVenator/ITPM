"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import React from "react";

export function EventImageEditor({
  eventId,
  initialImage,
  eventName
}: {
  eventId: string;
  initialImage?: string | null;
  eventName: string;
}) {
  const router = useRouter();
  const [eventImage, setEventImage] = useState(initialImage ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function onPickImage(file: File | null) {
    setError("");
    setSuccess("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Event picture must be an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Event picture must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEventImage(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventImage })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to update event picture.");
        return;
      }

      setSuccess("Event picture updated successfully.");
      router.refresh();
    } catch {
      setError("Something went wrong while updating the event picture.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSave}>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {eventImage ? (
          <img
            src={eventImage}
            alt={`${eventName} preview`}
            className="h-56 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-secondary">
            No preview available
          </div>
        )}
      </div>

      <div>
        <input
          className="input-field"
          type="file"
          accept="image/*"
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Edit Event Picture"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEventImage("")}>
          Remove Picture
        </Button>
      </div>
    </form>
  );
}
