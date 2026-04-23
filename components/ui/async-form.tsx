"use client";

import { FormHTMLAttributes, useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    onSubmit?.(e);
    if (e.defaultPrevented) return;

    e.preventDefault();

    const form = e.currentTarget;
    const body = new FormData(form);
    const controls = Array.from(
      form.querySelectorAll("button, input, textarea, select")
    ) as Array<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement>;
    const previousDisabled = controls.map((control) => control.disabled);
    controls.forEach((control) => {
      control.disabled = true;
    });
    setSubmitting(true);

    try {
      const res = await fetch(action, {
        method: typeof method === "string" ? method.toUpperCase() : "POST",
        body
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        window.alert(data?.error ?? "Action failed. Please try again.");
        controls.forEach((control, index) => {
          control.disabled = previousDisabled[index];
        });
        setSubmitting(false);
        return;
      }

      const target = redirectTo ?? (res.redirected ? toAppPath(res.url) : pathname);
      router.replace(target as Route);
      router.refresh();
    } catch {
      controls.forEach((control, index) => {
        control.disabled = previousDisabled[index];
      });
      setSubmitting(false);
      window.alert("Network error. Please try again.");
    }
  }

  return (
    <form
      {...props}
      action={action}
      method={method}
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className={`${props.className ?? ""} ${submitting ? "pointer-events-none opacity-90" : ""}`.trim()}
    >
      {children}
    </form>
  );
}
