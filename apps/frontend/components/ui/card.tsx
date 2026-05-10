import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-[1.5px] p-6",
        "bg-white dark:bg-[#161d30]",
        "border-[color:var(--border)] dark:border-[rgba(255,255,255,0.08)]",
        "shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.24)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
