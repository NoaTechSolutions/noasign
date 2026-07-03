"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLang } from "./LandingContext";

const THEME_KEY = "nts-theme";
const THEME_CHANGE_EVENT = "nts-theme-change";

// Reads the persisted theme, falling back to the OS preference. Client-only —
// the server snapshot below short-circuits it during SSR.
function readDark(): boolean {
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

export function FloatingControls() {
  const { lang, setLang } = useLang();
  // Persisted theme read as an external store via useSyncExternalStore. SSR-safe:
  // the server snapshot is `false` (light), adopted from storage/OS right after
  // hydration — no setState inside an effect (#418), no hydration mismatch.
  const dark = useSyncExternalStore(subscribeTheme, readDark, () => false);

  // Reflect the theme onto the document + swap logo visibility. Updating an
  // external system (the DOM) from state is the canonical, allowed use of an effect.
  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    root.classList.toggle("dark", dark);

    const lightLogos = document.querySelectorAll(".logo-light");
    const darkLogos = document.querySelectorAll(".logo-dark-img");

    lightLogos.forEach((el) => {
      (el as HTMLElement).style.display = dark ? "none" : "block";
    });
    darkLogos.forEach((el) => {
      (el as HTMLElement).style.display = dark ? "block" : "none";
    });
  }, [dark]);

  const toggleTheme = () => {
    window.localStorage.setItem(THEME_KEY, !dark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div className="float-controls">
      {/* Theme toggle */}
      <div className="float-ctrl-btn-wrap">
        <button className="thm-btn" onClick={toggleTheme}>
          <div className="thm-knob">{dark ? "🌙" : "☀"}</div>
        </button>
      </div>

      {/* Language buttons */}
      <div className="float-lang">
        <button
          className={`float-lang-btn${lang === "en" ? " on" : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
        <button
          className={`float-lang-btn${lang === "es" ? " on" : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
      </div>
    </div>
  );
}
