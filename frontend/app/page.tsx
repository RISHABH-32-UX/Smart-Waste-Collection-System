"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, ROLE_HOME, Session } from "../lib/api";

const features = [
  { icon: "📍", title: "Report precisely", text: "Snap a photo with auto-captured GPS coordinates — every complaint carries location evidence." },
  { icon: "🤖", title: "AI-assisted triage", text: "Image analysis estimates waste severity so supervisors can prioritise the worst hotspots first." },
  { icon: "🗺️", title: "Cluster & dispatch", text: "Nearby complaints are clustered into geofenced sites and routed to available municipal workers." },
  { icon: "✅", title: "Close with proof", text: "Before-and-after photo verification keeps every resolution accountable, end to end." },
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

  const workspaceHref = session ? ROLE_HOME[session.role] : null;
  const workspaceLabel = session
    ? session.role === "SUPERVISOR" ? "Open verification hub"
      : session.role === "WORKER" ? "Open my tasks"
        : session.role === "ADMIN" ? "Open admin console"
          : "Open my reports"
    : null;

  return (
    <main>
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 px-6 py-24 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-bold tracking-[.22em] text-emerald-200">SMART WASTE COLLECTION MANAGEMENT</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">Cleaner neighbourhoods, accountable collection.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-emerald-50">Report waste with location evidence. Municipal teams verify, dispatch, track, and close every cleanup transparently — with one portal for every role.</p>
          {session && workspaceHref && workspaceLabel ? (
            <div className="mt-9 rounded-xl border border-emerald-300/40 bg-white/10 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div><p className="text-sm font-bold text-white">You are signed in as {session.role.toLowerCase()}.</p><p className="mt-1 text-sm text-emerald-100">Your workspace is ready — no need to sign in again.</p></div>
              <Link className="mt-4 inline-block rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 sm:mt-0" href={workspaceHref}>{workspaceLabel}</Link>
            </div>
          ) : <div className="mt-9 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50" href="/register">Create an account</Link>
            <Link className="rounded-lg border border-emerald-300/60 px-5 py-3 text-sm font-semibold transition hover:bg-white/10" href="/login">Sign in</Link>
          </div>}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 p-10 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(f => (
          <article key={f.title} className="card">
            <p className="text-2xl">{f.icon}</p>
            <h2 className="mt-3 font-bold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
          </article>
        ))}
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight">How a complaint becomes a clean street</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-5">
            {workflow.map(w => (
              <li key={w.step} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-emerald-700">{w.step}</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{w.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{w.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        CleanCity — Smart Waste Collection Management System · Final-year engineering capstone
      </footer>
    </main>
  );
}
