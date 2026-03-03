"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileData = {
  id: string;
  name: string;
  username: string;
  itNumber: string;
  email: string;
  profileImage?: string | null;
  organiserBadge: boolean;
  role: string;
  createdAt: string;
};

export function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [itNumber, setItNumber] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [role, setRole] = useState("");
  const [badge, setBadge] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        if (mounted) {
          setError(data?.error ?? "Failed to load profile.");
          setLoading(false);
        }
        return;
      }

      if (!mounted) return;

      const profile = data as ProfileData;
      setName(profile.name ?? "");
      setUsername(profile.username ?? "");
      setItNumber(profile.itNumber ?? "");
      setEmail(profile.email ?? "");
      setProfileImage(profile.profileImage ?? "");
      setRole(profile.role ?? "student");
      setBadge(Boolean(profile.organiserBadge));
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      name: name.trim(),
      username: username.trim(),
      itNumber: itNumber.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      profileImage
    };

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "Failed to update profile.");
      return;
    }

    setSuccess("Profile updated successfully.");
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function onDelete() {
    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSuccess("");

    const res = await fetch("/api/profile", { method: "DELETE" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "Failed to delete account.");
      return;
    }

    window.location.href = "/signup";
  }

  if (loading) {
    return <p className="text-sm text-secondary">Loading profile...</p>;
  }

  return (
    <form className="space-y-5" onSubmit={onSave}>
      <div className="rounded-2xl border border-emerald-100 bg-highlight/50 p-4 text-sm text-primary">
        <p>Role: <span className="font-semibold">{role}</span></p>
        <p>Organiser Badge: <span className="font-semibold">{badge ? "Yes" : "No"}</span></p>
      </div>

      <div>
        <label className="label-text">Profile Picture (Optional)</label>
        <input
          className="input-field"
          type="file"
          accept="image/*"
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
        />
        {profileImage ? (
          <div className="mt-2 flex items-center gap-3">
            <img src={profileImage} alt="Profile preview" className="h-14 w-14 rounded-full object-cover" />
            <Button type="button" variant="secondary" onClick={() => setProfileImage("")}>
              Remove picture
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-secondary">No profile picture set.</p>
        )}
      </div>

      <div>
        <label className="label-text">Full Name</label>
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <label className="label-text">Username</label>
        <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>

      <div>
        <label className="label-text">IT Number</label>
        <input className="input-field" value={itNumber} onChange={(e) => setItNumber(e.target.value.toUpperCase())} required />
      </div>

      <div>
        <label className="label-text">University Email</label>
        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save Changes</Button>
        <Button type="button" variant="danger" onClick={onDelete}>Delete Account</Button>
      </div>
    </form>
  );
}
