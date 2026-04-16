"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "../../lib/landing-i18n";

const LANG_KEY = "ntssign-lang";

type LangContextValue = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read language preference from localStorage / browser on mount. Lazy useState
  // initializer would cause hydration mismatch (#418) since SSR cannot access
  // window/localStorage. Disabling the rule locally is the React-recommended
  // escape hatch for syncing with external storage on mount.
  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored === "en" || stored === "es") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
