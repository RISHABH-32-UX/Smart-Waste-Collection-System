"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, Role, Session } from "../lib/api";
import { isDevAuthBypass } from "../lib/devAuthBypass";
import {
  Recycle,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  LayoutDashboard,
  Eye,
  ShieldAlert,
  ClipboardList,
  HardHat,
  ShieldCheck,
  Home,
} from "lucide-react";

const destination: Record<Role, { href: string; label: string }> = {
  CITIZEN: { href: "/report", label: "My reports" },
  WORKER: { href: "/worker", label: "My tasks" },
  SUPERVISOR: { href: "/supervisor", label: "Verification hub" },
  ADMIN: { href: "/admin", label: "Admin console" },
};

const devPortalLinks = [
  { href: "/", label: "Home", icon: Home, color: "text-slate-700 bg-slate-100 hover:bg-slate-200" },
  { href: "/report", label: "Citizen", icon: ClipboardList, color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
  { href: "/worker", label: "Worker", icon: HardHat, color: "text-blue-700 bg-blue-50 hover:bg-blue-100" },
  { href: "/supervisor", label: "Supervisor", icon: ShieldCheck, color: "text-purple-700 bg-purple-50 hover:bg-purple-100" },
  { href: "/admin", label: "Admin", icon: ShieldAlert, color: "text-amber-800 bg-amber-50 hover:bg-amber-100" },
  { href: "/profile", label: "Profile", icon: User, color: "text-slate-700 bg-slate-100 hover:bg-slate-200" },
  { href: "/login", label: "Login", icon: LogIn, color: "text-slate-600 hover:bg-slate-100" },
  { href: "/register", label: "Register", icon: UserPlus, color: "text-slate-600 hover:bg-slate-100" },
];

export function AppHeader() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [devBypass, setDevBypass] = useState(isDevAuthBypass);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setDevBypass(isDevAuthBypass());
    const update = () => setSession(getSession());
    update();
    window.addEventListener("smart-waste-session", update);
    return () => window.removeEventListener("smart-waste-session", update);
  }, []);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const workspace = session ? destination[session.role] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-xs backdrop-blur-md">
      {devBypass && (
        <div className="border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
            </span>
            <span className="font-semibold tracking-wide">UI Preview Mode Active</span>
            <span className="hidden sm:inline text-amber-700/80">· Direct portal navigation & local mock data enabled</span>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex shrink-0 items-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 py-1"
          aria-label="PRAVDHAN Home"
        >
          <Image
            src="/logo.png"
            alt="PRAVDHAN Logo"
            width={120}
            height={40}
            priority
            className="h-9 sm:h-10 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-2">
          {devBypass ? (
            <div className="flex items-center gap-1.5">
              {devPortalLinks.map(link => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-emerald-700 text-white shadow-xs"
                        : link.color ?? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : session ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/" ? "text-emerald-800 bg-emerald-50/80" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Home
              </Link>
              <Link
                href={workspace!.href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname.startsWith(workspace!.href)
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>{workspace!.label}</span>
              </Link>
              <Link
                href="/profile"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/profile"
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <span className="badge-role">{session.role}</span>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  clearSession();
                  location.assign("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <LogIn className="h-4 w-4 text-slate-500" />
                <span>Sign in</span>
              </Link>
              <Link href="/register" className="btn-primary py-2 px-4 text-xs sm:text-sm">
                <UserPlus className="h-4 w-4" />
                <span>Create account</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden shadow-lg animate-fade-in">
          <div className="mb-3.5 pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} aria-label="PRAVDHAN Home">
              <Image
                src="/logo.png"
                alt="PRAVDHAN Logo"
                width={105}
                height={35}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</span>
          </div>
          {devBypass ? (
            <div className="space-y-1">
              <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">Preview Portals</p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {devPortalLinks.map(link => {
                  const isActive = pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                        isActive
                          ? "bg-emerald-700 text-white"
                          : link.color ?? "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : session ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs text-slate-500">Signed in as</span>
                <span className="badge-role">{session.role}</span>
              </div>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  pathname === "/" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                Home
              </Link>
              <Link
                href={workspace!.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  pathname.startsWith(workspace!.href) ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>{workspace!.label}</span>
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  pathname === "/profile" ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                onClick={() => {
                  clearSession();
                  location.assign("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create account</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
