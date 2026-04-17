"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";
import { APP_URL } from "../../lib/app-url";

export function Navbar() {
  const { lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const navRef = useRef<HTMLElement>(null);

  /* scroll → .scrolled class */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* IntersectionObserver for active nav link */
  useEffect(() => {
    const ids = ["features", "how", "pricing", "faq"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const closeMob = () => setMobOpen(false);

  const navLinks = [
    { href: "#features", label: T[lang].nav_f },
    { href: "#how", label: T[lang].nav_h },
    { href: "#pricing", label: T[lang].nav_pr },
    { href: "#faq", label: T[lang].nav_faq },
  ];

  return (
    <>
      <nav ref={navRef} className={`site-nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          {/* Hamburger — first in DOM for mobile (CSS moves it left) */}
          <button
            className="ham"
            aria-label="Open menu"
            aria-expanded={mobOpen}
            onClick={() => setMobOpen(!mobOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <Link className="nav-logo" href="/" aria-label="NTSsign home">
            <img
              className="logo-img logo-light"
              src="/img/NTSSign_AzulDark_SinFondo.svg"
              alt="NTSsign"
              width={140}
              height={36}
            />
            <img
              className="logo-img logo-dark-img"
              src="/img/NTSSign_blanco_SinFondo.svg"
              alt="NTSsign"
              width={140}
              height={36}
            />
          </Link>

          <ul className="nav-links" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={activeLink === link.href ? "active" : ""}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <a href={`${APP_URL}/login`} className="btn btn-g btn-sm">
              {T[lang].nav_li}
            </a>
            <a href={`${APP_URL}/request-access`} className="btn btn-p btn-sm">
              {T[lang].nav_ct}
            </a>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mob-menu${mobOpen ? " open" : ""}`} role="navigation">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={closeMob}>
            {link.label}
          </a>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: ".5rem" }}>
          <a href={`${APP_URL}/login`} className="btn btn-g btn-sm" onClick={closeMob}>
            {T[lang].nav_li}
          </a>
          <a href={`${APP_URL}/request-access`} className="btn btn-p btn-sm" onClick={closeMob}>
            {T[lang].nav_ct}
          </a>
        </div>
      </div>
    </>
  );
}
