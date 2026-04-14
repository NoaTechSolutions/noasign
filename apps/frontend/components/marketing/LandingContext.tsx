"use client";

import { createContext, useContext, useState } from "react";
import type { Lang } from "../../lib/landing-i18n";

const LANG_KEY = "ntssign-lang";

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored === "en" || stored === "es") return stored;
    const browser = navigator.language?.toLowerCase() ?? "";
    return browser.startsWith("es") ? "es" : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
