"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [itNumber, setItNumber] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const normalizedIT = itNumber.toUpperCase().trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      setError("Username must be 3-24 chars and only letters, numbers, underscores.");
      return;
    }

    if (!/^IT\d{8}$/.test(normalizedIT)) {
      setError("IT number must be in format IT12345678.");
      return;
    }

    if (!/^IT\d{8}@my\.sliit\.lk$/i.test(normalizedEmail)) {
      setError("Email must be in format IT12345678@my.sliit.lk.");
      return;
    }

    if (normalizedEmail.split("@")[0].toUpperCase() !== normalizedIT) {
      setError("Email username must match your IT number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, itNumber: normalizedIT, email: normalizedEmail, profileImage, password, confirmPassword })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not create account.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
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
            <img src={profileImage} alt="Profile preview" className="h-12 w-12 rounded-full object-cover" />
            <Button type="button" variant="secondary" onClick={() => setProfileImage("")}>
              Remove picture
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-xs text-secondary">You can skip this and add one later in My Profile.</p>
        )}
      </div>
      <input className="input-field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      <input className="input-field" placeholder="IT Number (e.g., IT12345678)" value={itNumber} onChange={(e) => setItNumber(e.target.value.toUpperCase())} required />
      <input className="input-field" type="email" placeholder="University email (IT12345678@my.sliit.lk)" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="input-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <input className="input-field" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" className="w-full">
        Create account
      </Button>
    </form>
  );
}
