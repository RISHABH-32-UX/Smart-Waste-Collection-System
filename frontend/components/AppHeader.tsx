"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSession, getSession, Role, Session } from "../lib/api";

const destination: Record<Role, { href: string; label: string }> = {
  CITIZEN: { href: "/report", label: "My reports" },
  WORKER: { href: "/worker", label: "My tasks" },
  SUPERVISOR: { href: "/supervisor", label: "Verification hub" },
  ADMIN: { href: "/admin", label: "Admin console" },
};

export function AppHeader() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const update = () => setSession(getSession());
    update(); window.addEventListener("smart-waste-session", update);
    return () => window.removeEventListener("smart-waste-session", update);
  }, []);
  const workspace = session ? destination[session.role] : null;
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <nav className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <span aria-hidden className="text-xl">♻</span><span>CleanCity</span>
        </Link>
        {session ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link className="hidden text-sm font-semibold text-slate-600 transition hover:text-emerald-800 sm:inline" href="/">Home</Link>
            <Link className="rounded-md px-2 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href={workspace!.href}>{workspace!.label}</Link>
            <Link className="rounded-md px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href="/profile">Profile</Link>
            <span className="hidden sm:inline-flex badge-role">{session.role}</span>
            <button className="rounded-md px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" onClick={() => { clearSession(); location.assign("/"); }}>Sign out</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href="/login">Sign in</Link>
            <Link className="btn-primary" href="/register">Create account</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
