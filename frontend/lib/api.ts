const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export type Role = "CITIZEN" | "WORKER" | "SUPERVISOR" | "ADMIN";
export type Session = { accessToken: string; role: Role; userId: string };

// Mirrors the user's single role into a cookie so middleware.ts can gate
// role-specific routes before a page renders. Not a security token.
const ROLE_COOKIE = "sw_role";

export const ROLE_HOME: Record<Role, string> = {
  CITIZEN: "/report",
  WORKER: "/worker",
  SUPERVISOR: "/supervisor",
  ADMIN: "/admin",
};

export function getAccessToken() { return typeof window === "undefined" ? null : sessionStorage.getItem("accessToken"); }

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("smartWasteSession");
  return raw ? JSON.parse(raw) as Session : null;
}

export function setSession(session: Session) {
  sessionStorage.setItem("smartWasteSession", JSON.stringify(session));
  sessionStorage.setItem("accessToken", session.accessToken);
  document.cookie = `${ROLE_COOKIE}=${session.role}; path=/; samesite=lax`;
  window.dispatchEvent(new Event("smart-waste-session"));
}

export function clearSession() {
  sessionStorage.removeItem("smartWasteSession");
  sessionStorage.removeItem("accessToken");
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
  window.dispatchEvent(new Event("smart-waste-session"));
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken() ?? getSession()?.accessToken;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

// Images are protected resources, so a normal <img> URL cannot be used: it
// cannot attach the JWT authorization header. Fetch the image as a Blob first
// and render the returned object URL instead.
export async function authorizedBlob(path: string): Promise<Blob> {
  const token = getAccessToken() ?? getSession()?.accessToken;
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error((await response.text()) || `Unable to load file (${response.status})`);
  return response.blob();
}
