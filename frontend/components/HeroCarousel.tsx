"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
  caption: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: "/hero-city.jpg",
    alt: "Modern clean urban street with sustainable green infrastructure",
    caption: "Clean urban avenues & sustainable civic infrastructure",
  },
  {
    src: "/hero-collection.jpg",
    alt: "Municipal waste collection and recycling logistics in a modern city",
    caption: "Smart waste collection & automated municipal logistics",
  },
  {
    src: "/hero-workers.jpg",
    alt: "Dedicated sanitation and waste management team at work",
    caption: "Field workforce coordination with verified arrival evidence",
  },
  {
    src: "/hero-recycling.jpg",
    alt: "Segregated waste sorting and sustainable recycling management",
    caption: "Circular waste segregation & community recycling hubs",
  },
  {
    src: "/hero-green-neighbourhood.jpg",
    alt: "Sustainable green neighbourhood and healthy urban community",
    caption: "Healthier neighbourhoods through accountable waste management",
  },
];

interface HeroCarouselProps {
  children?: React.ReactNode;
}

export function HeroCarousel({ children }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check reduced-motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setPrevious(current);
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, isPaused]);

  const goToSlide = (index: number) => {
    if (index === current) return;
    setPrevious(current);
    setCurrent(index);
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-slate-950 text-white min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="CleanCity photography carousel"
    >
      {/* Background Slides (Right to Left Slide) */}
      <div className="absolute inset-0 z-0">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === current;
          const isPrev = index === previous;

          // Standard right-to-left slide animation classes:
          // Active: enters from right (+100%) to center (0%)
          // Previous: exits from center (0%) to left (-100%)
          // Inactive: waits off-screen to the right (+100%)
          let positionClass = "translate-x-full opacity-0 z-0";
          let transitionClass = "transition-none";

          if (prefersReducedMotion) {
            positionClass = isActive ? "opacity-100 z-10 translate-x-0" : "opacity-0 z-0 translate-x-0";
            transitionClass = "transition-opacity duration-700 ease-in-out";
          } else {
            if (isActive) {
              positionClass = "translate-x-0 opacity-100 z-10";
              transitionClass = "transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]";
            } else if (isPrev) {
              positionClass = "-translate-x-full opacity-90 z-10";
              transitionClass = "transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]";
            }
          }

          return (
            <div
              key={slide.src}
              className={`absolute inset-0 w-full h-full will-change-transform ${positionClass} ${transitionClass}`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                quality={85}
                sizes="100vw"
                className="object-cover object-center transform scale-105 transition-transform duration-[6000ms] ease-out"
              />
            </div>
          );
        })}
      </div>

      {/* Dark Readability Overlays: Deep Left Gradient for High-Contrast Text */}
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-900/35 pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-emerald-950/20 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-28 z-20 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />

      {/* Foreground Hero Content */}
      <div className="relative z-30 w-full py-16 sm:py-20 lg:py-24">
        {children}
      </div>

      {/* Carousel Navigation Indicators */}
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex items-center gap-2">
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            onClick={() => goToSlide(index)}
            className={`group flex items-center h-2.5 transition-all duration-300 rounded-full ${
              index === current
                ? "w-8 bg-emerald-400"
                : "w-2.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}: ${slide.caption}`}
            aria-current={index === current}
          />
        ))}
      </div>
    </div>
  );
}

