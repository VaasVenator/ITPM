"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("form submitted");
    console.log("token:", token);

    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      console.log("API response:", data);

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setMessage(data.message || "Password reset successfully");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error("Reset request failed:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-card mx-auto max-w-md p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Secure Reset
      </p>

      <h1 className="mt-1 mb-5 text-2xl font-bold text-primary">
        Reset Password
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border p-3"
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded border p-3"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-3 text-white disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </section>
  );
}