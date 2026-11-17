"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthBypassed } from "../lib/api";
import {
  Home,
  MapPin,
  Truck,
  ClipboardCheck,
  ShieldCheck,
  User,
  LogIn,
  UserPlus,
  ArrowRight,
  LucideIcon,
} from "lucide-react";

export type DevRouteItem = {
  title: string;
  route: string;
  icon: LucideIcon;
  role: string;
  description: string;
  buttonText: string;
};

export const DEV_ROUTES: DevRouteItem[] = [
  {
    title: "Admin Dashboard",
    route: "/admin",
    icon: ShieldCheck,
    role: "ADMIN",
    description: "Manage system governance, user roles, operational analytics, and task cancellations.",
    buttonText: "Open Dashboard",
  },
  {
    title: "Supervisor Dashboard",
    route: "/supervisor",
    icon: ClipboardCheck,
    role: "SUPERVISOR",
    description: "Verify citizen reports, assign tasks to workers, monitor queues, and validate cleanup resolutions.",
    buttonText: "Open Dashboard",
  },
  {
    title: "Worker Dashboard",
    route: "/worker",
    icon: Truck,
    role: "WORKER",
    description: "View assigned field tasks, check in on site with geofence verification, and submit resolution proof.",
    buttonText: "Open Dashboard",
  },
  {
    title: "Citizen Report",
    route: "/report",
    icon: MapPin,
    role: "CITIZEN",
    description: "Submit waste complaints with photo upload and auto-captured GPS location evidence, and track report status.",
    buttonText: "Open Dashboard",
  },
  {
    title: "User Profile",
    route: "/profile",
    icon: User,
    role: "PROFILE",
    description: "View and manage user profile details, contact information, role access summary, and account status.",
    buttonText: "Open Profile",
  },
  {
    title: "Sign In",
    route: "/login",
    icon: LogIn,
    role: "AUTH",
    description: "Access the role-based sign-in screen to inspect login form handling and input validation UI.",
    buttonText: "Explore Form",
  },
  {
    title: "Create Account",
    route: "/register",
    icon: UserPlus,
    role: "AUTH",
    description: "Explore the account registration interface for citizens and municipal workers.",
    buttonText: "Explore Form",
  },
];

const GLOBAL_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/report", label: "Citizen Report", icon: MapPin },
  { href: "/worker", label: "Worker Dashboard", icon: Truck },
  { href: "/supervisor", label: "Supervisor Hub", icon: ClipboardCheck },
  { href: "/admin", label: "Admin Console", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: User },
];

/**
 * Global Navigation Subheader
 * Displays a sticky development menu with active link highlighting and status indicator.
 * Only rendered when bypass mode is active.
 */
export function DevGlobalNav() {
  const pathname = usePathname();
  if (!isAuthBypassed()) return null;

  return (
    <div className="border-t border-slate-200/80 bg-slate-50/95 px-4 py-1.5 text-xs backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 gap-x-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-inset ring-amber-600/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="hidden sm:inline">Development Mode – Authentication Bypassed</span>
            <span className="sm:hidden">Dev Mode (Bypassed)</span>
          </span>
        </div>
        <nav aria-label="Development Dashboards" className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs font-medium no-scrollbar">
          {GLOBAL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "bg-brand-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-950"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * Development Navigation Cards Section for the Homepage
 * Renders a complete grid of navigation cards for every interface.
 * Only rendered when bypass mode is active.
 */
export function DevDashboardCards() {
  if (!isAuthBypassed()) return null;

  return (
    <section id="dev-dashboards" className="border-b border-slate-200/90 bg-[#F1F5F4]/70 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-inset ring-amber-600/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Development Mode
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Authentication Bypassed</span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Explore All Dashboards</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Directly access and test every role-based dashboard, submission workflow, and authentication view without requiring backend credentials or Docker.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEV_ROUTES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.route}
                className="card-hoverable group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/15 transition group-hover:scale-105 group-hover:bg-brand-100">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="badge-role">{item.role}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-500">{item.route}</span>
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Link
                    href={item.route}
                    className="btn-primary w-full text-center text-xs group-hover:bg-brand-800 flex items-center justify-center gap-1.5"
                  >
                    <span>{item.buttonText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
