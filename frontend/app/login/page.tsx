"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ROLE_HOME, Role, setSession, getSession } from "../../lib/api";
import { isDevAuthBypass } from "../../lib/devAuthBypass";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Recycle,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // In preview mode, allow viewing the login page directly without auto-redirecting
    if (isDevAuthBypass()) return;
    const session = getSession();
    if (session) router.replace(nextPath() ?? ROLE_HOME[session.role]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  function nextPath() {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ accessToken: string; role: Role; userId: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data);
      router.push(nextPath() ?? ROLE_HOME[data.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-gradient-to-br from-slate-100/80 via-white to-emerald-50/50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8 shadow-card-hover border-slate-200/90">
          <div className="space-y-3">
            <Link href="/" className="inline-block transition hover:opacity-90" aria-label="PRAVDHAN Home">
              <Image
                src="/logo.png"
                alt="PRAVDHAN Logo"
                width={135}
                height={45}
                priority
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
            <div>
              <p className="eyebrow">WELCOME BACK</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to PRAVDHAN</h1>
            </div>
          </div>

          <p className="mt-3 mb-6 text-sm leading-relaxed text-slate-600">
            Access your role-based dashboard — citizens, workers, supervisors, and admins each get their own portal.
          </p>

          <form onSubmit={login} className="space-y-5">
            <div>
              <label className="field-label" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  className="field pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  className="field pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-error" role="alert">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button className="btn-primary w-full text-base font-semibold py-3" disabled={busy}>
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span>Sign in</span>
                  <LogIn className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Protected by stateless JWT authentication and role-based access.</span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          New here?{" "}
          <Link
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline underline-offset-2"
            href="/register"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center p-6">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="h-4 w-4 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin" />
            <span className="text-sm font-medium">Loading sign in…</span>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
