"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { Lang } from "../../lib/landing-i18n";

const LANG_KEY = "ntssign-lang";
const LANG_CHANGE_EVENT = "ntssign-lang-change";

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

// Reads the persisted language, falling back to the browser locale. Client-only —
// the server snapshot below short-circuits it during SSR.
function readStoredLang(): Lang {
  const stored = window.localStorage.getItem(LANG_KEY) as Lang | null;
  if (stored === "en" || stored === "es") return stored;
  const browser = navigator.language?.toLowerCase() ?? "";
  return browser.startsWith("es") ? "es" : "en";
}

function subscribeLang(onStoreChange: () => void) {
  window.addEventListener(LANG_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(LANG_CHANGE_EVENT, onStoreChange);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Persisted language read as an external store (localStorage) via
  // useSyncExternalStore. SSR-safe: the server snapshot is "en", adopted from
  // storage/browser right after hydration — no setState inside an effect (#418),
  // no hydration mismatch.
  const lang = useSyncExternalStore(subscribeLang, readStoredLang, () => "en" as Lang);

  const setLang = useCallback((l: Lang) => {
    window.localStorage.setItem(LANG_KEY, l);
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
