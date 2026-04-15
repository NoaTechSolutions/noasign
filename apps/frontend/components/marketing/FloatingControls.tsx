"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LandingContext";

export function FloatingControls() {
  const { lang, setLang } = useLang();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("nts-theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  /* Apply dark class + logo visibility whenever dark changes */
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
    const next = !dark;
    setDark(next);
    localStorage.setItem("nts-theme", next ? "dark" : "light");
  };

  return (
    <div className="float-controls">
      {/* Theme toggle */}
      <div className="float-ctrl-btn-wrap">
        <button className="thm-btn" onClick={toggleTheme}>
          <div className="thm-knob">{dark ? "\uD83C\uDF19" : "\u2600"}</div>
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
