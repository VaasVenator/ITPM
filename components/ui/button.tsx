import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70",
        {
          "bg-accent text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-600 focus:ring-emerald-100": variant === "primary",
          "bg-highlight text-primary hover:-translate-y-0.5 hover:bg-emerald-100 focus:ring-emerald-100": variant === "secondary",
          "bg-primary text-white hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-slate-200": variant === "danger"
        },
        className
      )}
      {...props}
    />
  );
}
