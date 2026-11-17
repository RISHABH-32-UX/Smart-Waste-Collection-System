"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, Role, Session } from "../lib/api";
import { DevGlobalNav } from "./DevNavigation";

const destination: Record<Role, { href: string; label: string }> = {
  CITIZEN: { href: "/report", label: "My reports" },
  WORKER: { href: "/worker", label: "My tasks" },
  SUPERVISOR: { href: "/supervisor", label: "Verification hub" },
  ADMIN: { href: "/admin", label: "Admin console" },
};

export function AppHeader() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const update = () => setSession(getSession());
    update(); window.addEventListener("smart-waste-session", update);
    return () => window.removeEventListener("smart-waste-session", update);
  }, []);

  // Dedicated authentication pages must be completely free of the main navbar and dev navigation
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const workspace = session ? destination[session.role] : null;
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
        >
          <Image
            src="/logo.png"
            alt="CleanCity"
            width={140}
            height={40}
            className="h-9 w-auto object-contain transition group-hover:opacity-90"
            priority
          />
        </Link>
        {session ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link className="hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline" href="/">Home</Link>
            <Link className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href={workspace!.href}>{workspace!.label}</Link>
            <Link className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href="/profile">Profile</Link>
            <span className="hidden sm:inline-flex badge-role">{session.role}</span>
            <button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" onClick={() => { clearSession(); location.assign("/"); }}>Sign out</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link className="rounded-lg px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700" href="/login">Sign in</Link>
            <Link className="btn-primary btn-sm" href="/register">Create account</Link>
          </div>
        )}
      </nav>
      <DevGlobalNav />
    </header>
  );
}
