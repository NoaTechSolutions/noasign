import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "w-[18px] h-[18px] rounded border-[1.5px]",
          "border-[color:var(--border)]",
          "bg-white dark:bg-[color:var(--bg-elevated)]",
          "checked:bg-[color:var(--brand-accent)]",
          "checked:border-[color:var(--brand-accent)]",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--focus-ring)]",
          "cursor-pointer",
          className,
        )}
        {...props}
      />
      {label ? (
        <label
          htmlFor={id}
          className="text-sm text-[color:var(--text-secondary)] cursor-pointer select-none"
        >
          {label}
        </label>
      ) : null}
    </div>
  );
}
