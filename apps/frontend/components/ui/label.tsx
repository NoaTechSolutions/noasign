import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-[13px] font-medium text-[color:var(--text-primary)] mb-1.5",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
