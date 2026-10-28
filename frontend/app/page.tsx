"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { getSession, ROLE_HOME, Session } from "../lib/api";
import { isDevAuthBypass } from "../lib/devAuthBypass";
import {
  MapPin,
  Sparkles,
  Layers,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  HardHat,
  ShieldAlert,
  User,
  CheckCircle2,
  Camera,
  Truck,
  Navigation,
  FileCheck2,
} from "lucide-react";

interface HeroSlide {
  image: string;
  title: string;
  alt: string;
}

const heroSlides: HeroSlide[] = [
  {
    image: "/images/hero/clean-city.jpg",
    title: "Pristine Urban Environments",
    alt: "A clean modern city boulevard with immaculate streets and recycling stations",
  },
  {
    image: "/images/hero/waste-collection.jpg",
    title: "Modern Municipal Collection",
    alt: "A green and white municipal waste collection truck operating along an organized urban street",
  },
  {
    image: "/images/hero/sanitation-workers.jpg",
    title: "Dedicated Field Teams",
    alt: "Municipal sanitation workers in high-visibility safety uniforms beside a recycling vehicle",
  },
  {
    image: "/images/hero/citizen-reporting.jpg",
    title: "Citizen Civic Engagement",
    alt: "A citizen using a mobile smartphone app to capture and report a roadside waste hotspot",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Report precisely",
    text: "Snap a photo with auto-captured GPS coordinates — every complaint carries location evidence.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted triage",
    text: "Image analysis estimates waste severity so supervisors can prioritise the worst hotspots first.",
  },
  {
    icon: Layers,
    title: "Cluster & dispatch",
    text: "Nearby complaints are clustered into geofenced sites and routed to available municipal workers.",
  },
  {
    icon: ShieldCheck,
    title: "Close with proof",
    text: "Before-and-after photo verification keeps every resolution accountable, end to end.",
  },
];

const workflow = [
  { step: "01", icon: Camera, title: "Citizen reports", text: "Photo + GPS + description submitted in seconds." },
  { step: "02", icon: CheckCircle2, title: "Verified", text: "Supervisor reviews the AI severity score and approves." },
  { step: "03", icon: Truck, title: "Assigned", text: "Complaints are clustered and dispatched to a worker." },
  { step: "04", icon: Navigation, title: "On site", text: "Geofence check-in confirms physical presence automatically." },
  { step: "05", icon: FileCheck2, title: "Closed", text: "After-photo reviewed and the ticket is resolved." },
];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [devBypass, setDevBypass] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setActiveSlide(curr => (curr + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlide(curr => (curr - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    setDevBypass(isDevAuthBypass());
    const update = () => setSession(getSession());
    update();
    window.addEventListener("smart-waste-session", update);
    return () => window.removeEventListener("smart-waste-session", update);
  }, []);

  // Hero carousel auto-rotation with accessibility & reduced motion support
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(nextSlide, 5500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide]);

  const workspaceHref = session ? ROLE_HOME[session.role] : null;
  const workspaceLabel = session
    ? session.role === "SUPERVISOR"
      ? "Open verification hub"
      : session.role === "WORKER"
        ? "Open my tasks"
        : session.role === "ADMIN"
          ? "Open admin console"
          : "Open my reports"
    : null;

  return (
    <main>
      {/* Hero Section with Crossfade Rotating Image Background */}
      <section
        className="relative min-h-[580px] overflow-hidden bg-slate-950 px-6 py-24 text-white lg:min-h-[640px] flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label="PRAVDHAN Highlights"
      >
        {/* Background Image Slides with Crossfade */}
        <div className="absolute inset-0 z-0">
          {heroSlides.map((slide, index) => {
            const isCurrent = index === activeSlide;
            return (
              <div
                key={slide.image}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isCurrent ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
                aria-hidden={!isCurrent}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className={`h-full w-full object-cover object-center transition-transform duration-[6000ms] ease-out ${
                    isCurrent ? "scale-105" : "scale-100"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Dark Green Gradient Overlay for Readability */}
        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-teal-950/80 backdrop-brightness-[0.85]"
          aria-hidden="true"
        />

        {/* Ambient bottom gradient blend */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-slate-900/70 to-transparent"
          aria-hidden="true"
        />

        {/* Hero Content */}
        <div className="relative z-20 mx-auto w-full max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3.5 py-1.5 backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
            </span>
            <p className="text-xs font-bold tracking-[.22em] uppercase text-emerald-200">
              SMART WASTE COLLECTION MANAGEMENT
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            Cleaner neighbourhoods,{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-white bg-clip-text text-transparent">
              accountable collection.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50/90 font-normal">
            Report waste with location evidence. Municipal teams verify, dispatch, track, and close every cleanup
            transparently — with one portal for every role.
          </p>

          {/* Primary Action Buttons */}
          {session && workspaceHref && workspaceLabel ? (
            <div className="mt-9 max-w-2xl rounded-2xl border border-emerald-400/30 bg-white/10 p-5 backdrop-blur-md sm:flex sm:items-center sm:justify-between sm:gap-5 shadow-xl">
              <div>
                <p className="text-sm font-bold text-white">Signed in as {session.role.toLowerCase()}</p>
                <p className="mt-1 text-xs text-emerald-100">Your dedicated workspace is ready — no need to sign in again.</p>
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-md transition hover:bg-emerald-50 hover:scale-[1.02] sm:mt-0"
                href={workspaceHref}
              >
                <span>{workspaceLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-950 shadow-lg shadow-black/20 transition hover:bg-emerald-50 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                href="/register"
              >
                <span>Create an account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                href="/login"
              >
                <span>Sign in</span>
              </Link>
            </div>
          )}

          {/* Quick Preview Portals (Development Mode Only) */}
          {devBypass && (
            <div className="mt-9 rounded-2xl border border-emerald-300/30 bg-emerald-950/60 p-4.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Quick Preview Portals (Dev Auth Bypass Active)
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-xs"
                  href="/report"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Citizen Portal</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 shadow-xs"
                  href="/worker"
                >
                  <HardHat className="h-3.5 w-3.5" />
                  <span>Worker Portal</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 shadow-xs"
                  href="/supervisor"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Supervisor Hub</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 shadow-xs"
                  href="/admin"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Admin Console</span>
                </Link>
                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700/90 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-600 shadow-xs"
                  href="/profile"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>User Profile</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Carousel Controls & Indicators */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeSlide ? "w-6 bg-emerald-400" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${i + 1} of ${heroSlides.length}: ${heroSlides[i].title}`}
                aria-current={i === activeSlide}
                onClick={() => setActiveSlide(i)}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
              aria-label="Previous slide"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
              aria-label="Next slide"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights with Lucide Icons */}
      <section className="mx-auto grid max-w-5xl gap-6 p-8 sm:p-10 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(f => {
          const Icon = f.icon;
          return (
            <article key={f.title} className="card-hoverable group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold text-slate-900 text-base">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </article>
          );
        })}
      </section>

      {/* Workflow Section */}
      <section className="border-t border-slate-200/80 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="eyebrow mx-auto justify-center">End-to-end transparency</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              How a complaint becomes a clean street
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              From civic reporting to photo-verified resolution, every step is audited and verifiable.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-5">
            {workflow.map(w => {
              const StepIcon = w.icon;
              return (
                <li
                  key={w.step}
                  className="group relative rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 transition-all duration-200 hover:border-emerald-300 hover:bg-white hover:shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      {w.step}
                    </span>
                    <StepIcon className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-700" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{w.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{w.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-50 px-6 py-10 text-center text-xs sm:text-sm text-slate-500">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 transition hover:opacity-90" aria-label="PRAVDHAN Home">
            <Image
              src="/logo.png"
              alt="PRAVDHAN Logo"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <p>© 2026 PRAVDHAN · Smart Waste Collection & Verification Infrastructure</p>
        </div>
      </footer>
    </main>
  );
}
