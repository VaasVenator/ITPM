import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4",
        {
          "bg-accent text-white shadow-sm hover:translate-y-[-1px] hover:bg-brand-dark focus:ring-emerald-100": variant === "primary",
          "bg-highlight text-primary hover:bg-emerald-100 focus:ring-emerald-100": variant === "secondary",
          "bg-primary text-white hover:bg-slate-800 focus:ring-slate-200": variant === "danger"
        },
        className
      )}
      {...props}
    />
  );
}
