"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ROLE_HOME, Role, setSession, getSession } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) router.replace(ROLE_HOME[session.role]);
  }, [router]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await api<{ accessToken: string; role: Role; userId: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setSession(data);
      router.push(ROLE_HOME[data.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-6">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <p className="text-xs font-bold tracking-[.2em] text-emerald-700">WELCOME BACK</p>
          <h1 className="mb-1 mt-2 text-2xl font-bold tracking-tight">Sign in to CleanCity</h1>
          <p className="mb-6 text-sm text-slate-600">Access your role-based dashboard — citizens, workers, supervisors, and admins each get their own portal.</p>
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" className="field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" className="field" type="password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="alert-error">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">New here? <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/register">Create an account</Link></p>
      </div>
    </main>
  );
}
