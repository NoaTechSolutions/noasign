"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { cn } from "@/lib/utils";

type SidebarContextProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
};

type SidebarBodyProps = {
  className?: string;
  children: ReactNode;
};

type SidebarLinkProps = {
  link: {
    label: string;
    icon: ReactNode;
  };
  href?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
};

export function Sidebar({ open, setOpen, children }: SidebarContextProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] shadow-[0_26px_80px_rgba(38,77,145,0.14)] transition-[width,transform,padding,opacity,border] duration-300 dark:border-white/10 dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] dark:shadow-[0_24px_80px_rgba(2,6,23,0.5)] md:relative md:inset-y-auto",
          open
            ? "w-[17.5rem] translate-x-0 p-4 opacity-100 md:w-[17.5rem] md:min-w-[17.5rem] md:p-5"
            : "-translate-x-[110%] border-r-0 p-0 opacity-0 md:w-0 md:min-w-0 md:translate-x-0 md:border-r-0 md:p-0 md:opacity-0",
        )}
      >
        <div className={cn("flex h-full flex-col", !open && "pointer-events-none md:hidden")}>
          {children}
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
        />
      ) : null}
    </>
  );
}

export function SidebarBody({ className, children }: SidebarBodyProps) {
  return <div className={cn("flex h-full flex-col", className)}>{children}</div>;
}

export function SidebarLink({
  link,
  href = "#",
  onClick,
  active = false,
  className,
}: SidebarLinkProps) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/6 dark:hover:text-white",
        active &&
          "bg-white text-slate-950 shadow-[0_12px_28px_rgba(36,76,144,0.10)] dark:bg-white/10 dark:text-white dark:shadow-none",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-slate-200 group-hover:text-slate-800 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-white/10 dark:group-hover:text-white",
          active &&
            "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        )}
      >
        {link.icon}
      </span>
      <span className="truncate">{link.label}</span>
    </a>
  );
}
