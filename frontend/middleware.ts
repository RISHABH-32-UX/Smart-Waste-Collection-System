import { NextRequest, NextResponse } from "next/server";

// Server-side route gate: every role-specific dashboard is only reachable
// after sign-in, and only by the one role that owns it. The definitive
// authorization check remains the backend JWT; this middleware blocks
// unauthenticated/wrong-role page renders before they happen.
const ROUTE_ROLES: Record<string, string[]> = {
  "/report": ["CITIZEN"],
  "/worker": ["WORKER"],
  "/supervisor": ["SUPERVISOR"],
  "/admin": ["ADMIN"],
};

const HOME_BY_ROLE: Record<string, string> = {
  CITIZEN: "/report",
  WORKER: "/worker",
  SUPERVISOR: "/supervisor",
  ADMIN: "/admin",
};

export function middleware(request: NextRequest) {
  // Temporary development-only UI preview bypass
  // Must only run in development mode; never active in production
  const isDevAuthBypass =
    process.env.NODE_ENV === "development" &&
    (process.env.DEV_AUTH_BYPASS === "true" || process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true");

  if (isDevAuthBypass) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const prefix = Object.keys(ROUTE_ROLES).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  const role = request.cookies.get("sw_role")?.value;
  if (pathname === "/profile") {
    if (role) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!prefix) return NextResponse.next();

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!ROUTE_ROLES[prefix].includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_BY_ROLE[role] ?? "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/report/:path*", "/worker/:path*", "/supervisor/:path*", "/admin/:path*", "/profile"] };
