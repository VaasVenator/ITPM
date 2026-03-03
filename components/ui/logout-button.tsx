"use client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <Button type="button" variant="secondary" onClick={onLogout}>
      Log out
    </Button>
  );
}
