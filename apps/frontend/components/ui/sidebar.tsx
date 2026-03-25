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
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-hidden border-r border-[color:var(--border)] bg-[image:var(--sidebar-bg-soft)] shadow-[var(--shadow-strong)] transition-[width,transform,padding,opacity,border] duration-300 xl:relative xl:inset-y-auto",
          open
            ? "w-[17.5rem] translate-x-0 p-4 opacity-100 xl:w-[17.5rem] xl:min-w-[17.5rem] xl:p-5"
            : "-translate-x-[110%] border-r-0 p-0 opacity-0 xl:w-0 xl:min-w-0 xl:translate-x-0 xl:border-r-0 xl:p-0 xl:opacity-0",
        )}
      >
        <div className={cn("flex h-full flex-col", !open && "pointer-events-none xl:hidden")}>
          {children}
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-[color:var(--bg-overlay)] xl:hidden"
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
        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[color:var(--menu-hover)] hover:text-[color:var(--menu-text)]",
        active &&
          "bg-[color:var(--bg-elevated)] text-[color:var(--menu-text)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--bg-surface)] text-[color:var(--menu-text-muted)] transition group-hover:bg-[color:var(--bg-surface-strong)] group-hover:text-[color:var(--menu-text)]",
          active &&
            "bg-[color:var(--badge-primary-bg)] text-[color:var(--brand-secondary)]",
        )}
      >
        {link.icon}
      </span>
      <span className="truncate">{link.label}</span>
    </a>
  );
}
