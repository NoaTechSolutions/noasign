"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: "documents-signing",
    src: "/login-hero.png",
    alt: "NTSsign document signing workspace preview",
  },
  {
    id: "documents-workflow",
    src: "/login-hero.png",
    alt: "NTSsign workflow preview",
  },
  {
    id: "documents-management",
    src: "/login-hero.png",
    alt: "NTSsign contracts management preview",
  },
];

export function LoginHeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = useMemo(() => slides[activeIndex] ?? slides[0], [activeIndex]);

  function goPrevious() {
    setActiveIndex((current) => (current === 0 ? slides.length - 1 : current - 1));
  }

  function goNext() {
    setActiveIndex((current) => (current === slides.length - 1 ? 0 : current + 1));
  }

  return (
    <div className="relative z-10 flex h-full items-center justify-center px-2 py-4 md:px-3 md:py-5 lg:px-4 lg:py-6">
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative aspect-[2/3] h-full max-h-full w-full max-w-[35rem] overflow-hidden rounded-[2rem] border border-[color:var(--brand-secondary)] bg-white shadow-[0_22px_70px_rgba(8,22,47,0.20)] xl:max-w-[38rem] dark:border-[color:var(--border-strong)] dark:bg-[color:var(--bg-elevated)]">
          <Image
            key={activeSlide.id}
            src={activeSlide.src}
            alt={activeSlide.alt}
            fill
            priority
            className="object-cover object-center lg:object-[center_38%]"
            sizes="(min-width: 1280px) 38rem, (min-width: 768px) 35rem, 100vw"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[rgba(8,22,47,0.66)] via-[rgba(8,22,47,0.2)] to-transparent" />

          <div className="absolute bottom-5 left-5 flex items-center gap-3">
            <button
              type="button"
              onClick={goPrevious}
              aria-label="Previous slide"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-[rgba(255,255,255,0.14)] text-white shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-white/30 hover:bg-[rgba(255,255,255,0.2)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-[rgba(255,255,255,0.14)] text-white shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-white/30 hover:bg-[rgba(255,255,255,0.2)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute bottom-6 right-5 flex items-center gap-2">
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2.5 rounded-full transition ${
                    isActive
                      ? "w-8 bg-white"
                      : "w-2.5 bg-white/45 hover:bg-white/65"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
