"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

// Sidebar open-state shared between CustomersSidebar (owns the chrome) and
// CustomersTopBar (hosts the hamburger button that re-opens the sidebar when
// collapsed on mobile). Provider lives at customers/layout.tsx so every page
// under /dashboard/customers/** gets the same instance.

type SidebarCtx = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const Ctx = createContext<SidebarCtx | null>(null);

export function CustomersSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    function sync() {
      setOpen(window.innerWidth >= 1280);
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function useCustomersSidebar(): SidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useCustomersSidebar must be used inside CustomersSidebarProvider",
    );
  }
  return ctx;
}
