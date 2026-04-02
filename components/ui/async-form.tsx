"use client";

import { FormHTMLAttributes } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

type AsyncFormProps = FormHTMLAttributes<HTMLFormElement> & {
  action: string;
  redirectTo?: string;
};

function toAppPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function AsyncForm({
  action,
  method = "post",
  redirectTo,
  onSubmit,
  children,
  ...props
}: AsyncFormProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    onSubmit?.(e);
    if (e.defaultPrevented) return;

    e.preventDefault();

    const form = e.currentTarget;
    const body = new FormData(form);

    try {
      const res = await fetch(action, {
        method: typeof method === "string" ? method.toUpperCase() : "POST",
        body
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Action failed. Please try again.");
        return;
      }

      const target = redirectTo ?? (res.redirected ? toAppPath(res.url) : pathname);
      router.replace(target as Route);
      router.refresh();
    } catch {
      window.alert("Network error. Please try again.");
    }
  }

  return (
    <form {...props} action={action} method={method} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
