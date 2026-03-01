"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [itNumber, setItNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

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
      body: JSON.stringify({ username, itNumber: normalizedIT, email: normalizedEmail, password, confirmPassword })
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
