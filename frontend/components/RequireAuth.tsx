"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession } from "../lib/api";
import { isDevAuthBypass } from "../lib/devAuthBypass";

/** Client-side guard for screens shared by every authenticated role. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(isDevAuthBypass);

  useEffect(() => {
    // Development-only preview bypass: skip redirect so UI can be inspected
    if (isDevAuthBypass()) {
      setAllowed(true);
      return;
    }

    if (!getSession()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setAllowed(true);
  }, [pathname, router]);

  return allowed ? <>{children}</> : <main className="mx-auto max-w-xl p-10 text-center text-slate-500">Checking access…</main>;
}
