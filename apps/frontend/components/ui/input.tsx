import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error = false, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border-[1.5px] px-[14px] py-[11px] text-sm",
        "bg-white dark:bg-[#161d30]",
        "text-[color:var(--text-primary)]",
        "transition-colors",
        "focus:outline-none focus:ring-2",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[color:var(--bg-surface)]",
        error
          ? "border-[color:var(--button-danger)] focus:border-[color:var(--button-danger)] focus:ring-[color:var(--focus-ring-danger)]"
          : "border-[color:var(--border)] focus:border-[color:var(--brand-accent)] focus:ring-[color:var(--focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
