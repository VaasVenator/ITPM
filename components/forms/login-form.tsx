"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError("");

  if (!identifier || !password) {
    setError("Username/email and password are required.");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.error || "Login failed.");
      return;
    }

    const redirectPath = new URLSearchParams(window.location.search).get("redirect");
    window.location.href = redirectPath || "/";
  } catch (error) {
    console.error("Login request failed:", error);
    setError("Something went wrong while logging in.");
  }
}

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <input
        className="input-field"
        type="text"
        placeholder="Username or email"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
      />
      <input
        className="input-field"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  );
}
