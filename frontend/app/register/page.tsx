"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ROLE_HOME, Role, setSession, getSession } from "../../lib/api";
import { isDevAuthBypass } from "../../lib/devAuthBypass";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  MapPin,
  HardHat,
  Recycle,
  CheckCircle2,
} from "lucide-react";

type AccountType = "CITIZEN" | "WORKER";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("CITIZEN");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // In preview mode, allow viewing the register page directly without auto-redirecting
    if (isDevAuthBypass()) return;
    const session = getSession();
    if (session) router.replace(ROLE_HOME[session.role]);
  }, [router]);

  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ accessToken: string; role: Role; userId: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, phone, password, role: accountType }),
      });
      setSession(data);
      router.push(ROLE_HOME[data.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const types: { value: AccountType; title: string; description: string; icon: typeof MapPin }[] = [
    {
      value: "CITIZEN",
      title: "Citizen",
      description: "Report waste with photo + GPS and track every complaint to closure.",
      icon: MapPin,
    },
    {
      value: "WORKER",
      title: "Municipal worker",
      description: "Receive assigned cleanup tasks, check in on site, submit proof.",
      icon: HardHat,
    },
  ];

  return (
    <main className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-gradient-to-br from-slate-100/80 via-white to-emerald-50/50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
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
              <p className="eyebrow">CREATE ACCOUNT</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Join PRAVDHAN</h1>
            </div>
          </div>

          <p className="mt-3 mb-6 text-sm leading-relaxed text-slate-600">
            Each account has exactly one role. Supervisor and admin access is granted by an administrator.
          </p>

          <form onSubmit={register} className="space-y-5">
            <fieldset>
              <legend className="field-label">Account type</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {types.map(type => {
                  const isSelected = accountType === type.value;
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.value}
                      className={`relative flex flex-col justify-between cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        className="sr-only"
                        value={type.value}
                        checked={isSelected}
                        onChange={() => setAccountType(type.value)}
                      />
                      <div>
                        <div className="flex items-center justify-between">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              isSelected ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                        </div>
                        <span className="mt-3 block text-sm font-bold text-slate-900">{type.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-600">{type.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label className="field-label" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  className="field pl-10"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

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
              <label className="field-label" htmlFor="phone">
                Phone Number <span className="font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  id="phone"
                  className="field pl-10"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0" htmlFor="password">
                  Password
                </label>
                <span className="text-xs text-slate-500">Min. 12 characters</span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  className="field pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  minLength={12}
                  placeholder="Minimum 12 characters"
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
                  <span>Creating account…</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span>Create {accountType === "CITIZEN" ? "citizen" : "worker"} account</span>
                  <UserPlus className="h-4 w-4" />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline underline-offset-2"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
