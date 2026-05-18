import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-[1.5px] p-6",
        "bg-white dark:bg-[color:var(--bg-elevated)]",
        "border-[color:var(--border)]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.24)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
