"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, ROLE_HOME, Role } from "../lib/api";

// Client-side guard complementing middleware.ts — middleware blocks the
// request using the role cookie; this confirms against the actual session.
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter(); const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    if (session.role !== role) { router.replace(ROLE_HOME[session.role]); return; }
    setAllowed(true);
  }, [role, router]);
  return allowed ? <>{children}</> : <main className="mx-auto max-w-xl p-10 text-center text-slate-500">Checking access…</main>;
}
