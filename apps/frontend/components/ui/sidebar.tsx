"use client";

import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const isLightActive = !isDark && active;
  const isLightHovered = !isDark && isHovered;

  return (
    <a
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(event) => {
        if (onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-[color:var(--menu-text-muted)] transition dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
        active &&
          "shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
        className,
      )}
      style={
        !isDark
          ? {
              backgroundColor: isLightActive ? "#bdd4ff" : isLightHovered ? "#d8e6ff" : "transparent",
              color: isLightActive || isLightHovered ? "#022977" : undefined,
            }
          : undefined
      }
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition dark:bg-[color:var(--bg-surface)] dark:text-[color:var(--menu-text-muted)] dark:group-hover:bg-[rgba(255,255,255,0.08)] dark:group-hover:text-white",
          active &&
            "dark:bg-[rgba(255,255,255,0.12)] dark:text-white",
        )}
        style={
          !isDark
            ? {
                backgroundColor: isLightActive ? "#9fbeff" : isLightHovered ? "#bdd4ff" : "#e4efff",
                color: isLightActive || isLightHovered ? "#022977" : "#5574a6",
              }
            : undefined
        }
      >
        {link.icon}
      </span>
      <span className="truncate">{link.label}</span>
    </a>
  );
}
