"use client";

import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "secondary";
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "rounded-lg font-medium text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        {
          "bg-[color:var(--button-primary)] text-white hover:bg-[color:var(--button-primary-hover)] px-[26px] py-[11px]":
            variant === "primary",

          "bg-white dark:bg-[#0b0f1a] border-[2.5px] border-[color:var(--brand-secondary)] dark:border-[color:var(--brand-accent)] text-[color:var(--brand-secondary)] dark:text-[color:var(--brand-accent)] hover:bg-[color:var(--brand-secondary)] dark:hover:bg-[color:var(--brand-accent)] hover:text-white dark:hover:text-[#00183a] px-6 py-[9px]":
            variant === "ghost",

          "bg-[#ff9900] text-white hover:bg-[#cc7a00] px-[26px] py-[11px]":
            variant === "secondary",
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
