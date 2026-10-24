"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ROLE_HOME, Role, setSession, getSession } from "../../lib/api";

type AccountType = "CITIZEN" | "WORKER";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("CITIZEN");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) router.replace(ROLE_HOME[session.role]);
  }, [router]);

  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const data = await api<{ accessToken: string; role: Role; userId: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, phone, password, role: accountType }),
      });
      setSession(data);
      router.push(ROLE_HOME[data.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setBusy(false); }
  }

  const types: { value: AccountType; title: string; description: string; icon: string }[] = [
    { value: "CITIZEN", title: "Citizen", description: "Report waste with photo + GPS and track every complaint to closure.", icon: "📍" },
    { value: "WORKER", title: "Municipal worker", description: "Receive assigned cleanup tasks, check in on site, submit proof.", icon: "🚛" },
  ];

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-6">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <p className="text-xs font-bold tracking-[.2em] text-emerald-700">CREATE ACCOUNT</p>
          <h1 className="mb-1 mt-2 text-2xl font-bold tracking-tight">Join CleanCity</h1>
          <p className="mb-6 text-sm text-slate-600">Each account has exactly one role. Supervisor and admin access is granted by an administrator.</p>
          <form onSubmit={register} className="space-y-4">
            <fieldset>
              <legend className="field-label">Account type</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {types.map(type => (
                  <label key={type.value} className={`cursor-pointer rounded-xl border p-3.5 transition ${accountType === type.value ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <input type="radio" name="accountType" className="sr-only" value={type.value} checked={accountType === type.value} onChange={() => setAccountType(type.value)} />
                    <span className="text-xl">{type.icon}</span>
                    <span className="mt-1 block text-sm font-bold text-slate-900">{type.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-600">{type.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="field-label" htmlFor="fullName">Full name</label>
              <input id="fullName" className="field" placeholder="Jane Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" className="field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="phone">Phone <span className="font-normal text-slate-400">(optional)</span></label>
              <input id="phone" className="field" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" className="field" type="password" minLength={12} placeholder="Minimum 12 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="alert-error">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : `Create ${accountType === "CITIZEN" ? "citizen" : "worker"} account`}</button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-emerald-700 hover:text-emerald-800" href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
