"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getSession, isAuthBypassed, ROLE_HOME, Session } from "../lib/api";
import { DevDashboardCards } from "../components/DevNavigation";
import { HeroCarousel } from "../components/HeroCarousel";
import {
  MapPin,
  Sparkles,
  Route,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  text: string;
};

const features: FeatureItem[] = [
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
    icon: Route,
    title: "Cluster & dispatch",
    text: "Nearby complaints are clustered into geofenced sites and routed to available municipal workers.",
  },
  {
    icon: CheckCircle2,
    title: "Close with proof",
    text: "Before-and-after photo verification keeps every resolution accountable, end to end.",
  },
];

const workflow = [
  { step: "01", title: "Citizen reports", text: "Photo + GPS + description submitted in seconds." },
  { step: "02", title: "Verified", text: "Supervisor reviews the AI severity score and approves." },
  { step: "03", title: "Assigned", text: "Complaints are clustered and dispatched to a worker." },
  { step: "04", title: "On site", text: "Geofence check-in confirms physical presence automatically." },
  { step: "05", title: "Closed", text: "After-photo reviewed and the ticket is resolved." },
];

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const update = () => setSession(getSession());
    update();
    window.addEventListener("smart-waste-session", update);
    return () => window.removeEventListener("smart-waste-session", update);
  }, []);

  const isBypassed = isAuthBypassed();
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

  // Primary action button destination
  const primaryHref = isBypassed || session ? "/report" : "/login?next=/report";
  // Secondary action button destination
  const secondaryHref = isBypassed ? "#dev-dashboards" : "#features";

  return (
    <main className="min-h-screen">
      {/* Hero Section with Automatic Background Image Carousel */}
      <HeroCarousel>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl lg:max-w-3xl">
            {/* Main Heading */}
            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
              Building Cleaner Cities, One Smarter Collection at a Time.
            </h1>

            {/* Description */}
            <p className="mt-5 text-base leading-relaxed text-slate-100 sm:text-lg sm:leading-relaxed max-w-2xl drop-shadow">
              Report waste, coordinate municipal teams, and track every cleanup transparently through one unified platform.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href={primaryHref}
                className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 shadow-lg flex items-center gap-2 transition"
              >
                <span>Report Waste</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={secondaryHref}
                className="btn-secondary border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 backdrop-blur-sm transition"
              >
                Explore Our Platform
              </a>

              {session && workspaceHref && workspaceLabel && (
                <Link
                  href={workspaceHref}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-900/60 px-4 py-2.5 text-xs font-bold text-emerald-200 backdrop-blur-sm hover:bg-emerald-900/80 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{workspaceLabel}</span>
                </Link>
              )}

              {isBypassed && !session && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-950/60 px-3.5 py-2 text-xs font-semibold text-amber-300 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Development Mode Active
                </span>
              )}
            </div>
          </div>
        </div>
      </HeroCarousel>

      {/* Development Dashboard Section (conditional on bypass mode) */}
      <DevDashboardCards />

      {/* Feature Capabilities Section */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">Civic accountability</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Intelligent Municipal Operations
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Every complaint carries undeniable evidence, real-time geofence verification, and transparent closure proof.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="card-hoverable group flex flex-col justify-between">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/15 transition group-hover:scale-105 group-hover:bg-brand-100">
                    <Icon className="w-5 h-5 text-brand-700" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-brand-700">
                  <span>0{i + 1}</span>
                  <span className="h-0.5 w-6 bg-brand-300" />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Complaint Lifecycle Workflow Section */}
      <section className="border-t border-slate-200/90 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="eyebrow">End-to-end transparency</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              How a complaint becomes a clean street
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
              Standard operating procedure designed to eliminate lost reports and untracked work.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-5">
            {workflow.map((w, index) => (
              <li
                key={w.step}
                className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-brand-300 hover:bg-white hover:shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 font-mono text-xs font-bold text-white shadow-sm">
                      {w.step}
                    </span>
                    {index < workflow.length - 1 && (
                      <span className="hidden font-mono text-xs font-semibold text-slate-300 md:inline">
                        →
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{w.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{w.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer with CleanCity Logo */}
      <footer className="border-t border-slate-200/80 bg-slate-50 px-4 py-8 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CleanCity"
              width={120}
              height={32}
              className="h-7 w-auto object-contain"
            />
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-600">Smart Waste Collection Management System</span>
          </div>
          <p className="text-slate-400">Sustainable civic infrastructure platform</p>
        </div>
      </footer>
    </main>
  );
}
