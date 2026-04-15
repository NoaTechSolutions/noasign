"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "../../lib/landing-i18n";

const LANG_KEY = "ntssign-lang";

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored === "en" || stored === "es") {
      setLangState(stored);
      return;
    }
    const browser = navigator.language?.toLowerCase() ?? "";
    if (browser.startsWith("es")) setLangState("es");
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
