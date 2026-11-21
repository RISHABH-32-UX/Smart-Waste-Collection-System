"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ROLE_HOME, Role, setSession, getSession } from "../../lib/api";
import {
  MapPin,
  Truck,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Route,
  ShieldCheck,
  LucideIcon,
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
    const session = getSession();
    if (session) router.replace(ROLE_HOME[session.role]);
  }, [router]);

  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        accessToken: string;
        role: Role;
        userId: string;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          role: accountType,
        }),
      });
      setSession(data);
      router.push(ROLE_HOME[data.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const types: {
    value: AccountType;
    title: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      value: "CITIZEN",
      title: "Citizen Reporter",
      description: "Report waste hotspots with photo + GPS, track complaints to closure.",
      icon: MapPin,
    },
    {
      value: "WORKER",
      title: "Municipal Worker",
      description: "Receive assigned field tasks, check in on site, and submit proof.",
      icon: Truck,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F7FAF9] lg:flex-row">
      {/* Left Visual Branding Panel (~45% width on desktop) */}
      <section className="relative hidden w-full overflow-hidden bg-brand-950 p-10 lg:flex lg:w-[45%] xl:w-[42%] lg:flex-col lg:justify-between xl:p-14 text-white min-h-screen">
        {/* Background Image with Dark Forest-Green Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-green-neighbourhood.jpg"
            alt="Sustainable clean urban neighbourhood"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-950/95 via-brand-900/90 to-brand-950/95 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10">
          <Link
            href="/"
            title="Back to CleanCity Home"
            className="inline-block rounded-2xl bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-md transition hover:bg-white hover:shadow-lg"
          >
            <Image
              src="/logo.png"
              alt="CleanCity / PRAVDHAN"
              width={150}
              height={42}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            PRAVDHAN CIVIC PLATFORM
          </div>
        </div>

        {/* Core Value Proposition */}
        <div className="relative z-10 my-auto py-10">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl drop-shadow-sm">
            Building Cleaner Communities Together.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-emerald-100/90 xl:text-base xl:leading-relaxed max-w-lg">
            Empowering citizens and municipal teams through smarter waste
            collection, transparent reporting, and sustainable urban management.
          </p>

          <div className="mt-8 space-y-3.5 border-t border-emerald-800/60 pt-6">
            <div className="flex items-center gap-3 text-xs font-medium text-emerald-100 xl:text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-900/80 text-emerald-300 ring-1 ring-emerald-400/20">
                <MapPin className="w-4 h-4" />
              </span>
              <span>Citizen reporting with photo & automated GPS</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-emerald-100 xl:text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-900/80 text-emerald-300 ring-1 ring-emerald-400/20">
                <Route className="w-4 h-4" />
              </span>
              <span>Municipal workforce routing & site geofences</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-emerald-100 xl:text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-900/80 text-emerald-300 ring-1 ring-emerald-400/20">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span>Supervisor audit & transparent ticket closure</span>
            </div>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 flex items-center justify-between border-t border-emerald-800/50 pt-5 text-xs text-emerald-200/80">
          <span>Smart Urban Sanitation Infrastructure</span>
          <span className="font-semibold text-emerald-300">Public Systems</span>
        </div>
      </section>

      {/* Right Registration Form Panel (~55% width on desktop) */}
      <section className="flex flex-1 flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen py-10 sm:py-14 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile-Only Brand Header */}
          <div className="mb-6 text-center lg:hidden">
            <Link href="/" title="Back to CleanCity Home" className="inline-block">
              <Image
                src="/logo.png"
                alt="CleanCity / PRAVDHAN"
                width={140}
                height={40}
                className="mx-auto h-9 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Form Card */}
          <div className="card rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-card">
            <div>
              <span className="eyebrow">Account Onboarding</span>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Create Your Account
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Join PRAVDHAN and help build cleaner, smarter communities.
              </p>
            </div>

            <form onSubmit={register} className="mt-6 space-y-4">
              {/* Operational Role Selection */}
              <fieldset>
                <legend className="field-label">Select Operational Role</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {types.map((type) => (
                    <label
                      key={type.value}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        accountType === type.value
                          ? "border-brand-700 bg-brand-50/70 ring-2 ring-brand-600/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="accountType"
                        className="sr-only"
                        value={type.value}
                        checked={accountType === type.value}
                        onChange={() => setAccountType(type.value)}
                      />
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            accountType === type.value
                              ? "bg-brand-700 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <type.icon className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">
                            {type.title}
                          </span>
                        </div>
                      </div>
                      <span className="mt-2 block text-[11px] leading-snug text-slate-500">
                        {type.description}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Full Legal Name */}
              <div>
                <label className="field-label" htmlFor="fullName">
                  Full Legal Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    className="field pl-10 text-xs sm:text-sm rounded-xl border-slate-300 placeholder:text-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="field-label" htmlFor="email">
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    className="field pl-10 text-xs sm:text-sm rounded-xl border-slate-300 placeholder:text-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Phone Number (Optional) */}
              <div>
                <label className="field-label" htmlFor="phone">
                  Mobile Phone{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phone"
                    className="field pl-10 text-xs sm:text-sm rounded-xl border-slate-300 placeholder:text-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="field-label" htmlFor="password">
                  Security Password{" "}
                  <span className="font-normal text-slate-400">
                    (minimum 12 characters)
                  </span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    className="field pl-10 pr-10 text-xs sm:text-sm rounded-xl border-slate-300 placeholder:text-slate-400 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/10"
                    type={showPassword ? "text" : "password"}
                    minLength={12}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Registration Error</p>
                    <p className="mt-0.5 text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-sm transition-all hover:shadow-md hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 rounded-xl mt-2"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Registering Account…</span>
                  </>
                ) : (
                  <>
                    <span>
                      Create{" "}
                      {accountType === "CITIZEN" ? "Citizen" : "Worker"} Account
                    </span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Navigation to Login */}
          <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/70 p-4 text-center text-xs text-slate-600">
            <span>Already registered? </span>
            <Link
              className="font-bold text-brand-700 hover:text-brand-800 underline underline-offset-2 ml-1"
              href="/login"
            >
              Sign in to portal
            </Link>
          </div>

          {/* Back to Home Link */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to CleanCity Home</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
