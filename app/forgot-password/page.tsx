"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setMessage(data.message || "Reset link sent successfully");
      setEmail("");
    } catch {
      setError("Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-card mx-auto max-w-md p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Account Recovery
      </p>
      <h1 className="mt-1 mb-5 text-2xl font-bold text-primary">
        Forgot Password
      </h1>

      <p className="mb-4 text-sm text-gray-600">
        Enter your email address and we’ll send you a password reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-3"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-3 text-white disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  );
}