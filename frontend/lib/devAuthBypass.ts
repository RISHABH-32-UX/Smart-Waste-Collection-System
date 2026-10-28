/**
 * Temporary Frontend UI Development Preview Mode
 *
 * When NEXT_PUBLIC_DEV_AUTH_BYPASS or DEV_AUTH_BYPASS is set to "true"
 * AND NODE_ENV === "development", authentication checks, route guards, and role
 * requirements are bypassed to enable local frontend UI inspection without
 * running the Spring Boot backend or PostgreSQL database.
 *
 * In production (NODE_ENV !== "development"), this function ALWAYS returns false,
 * guaranteeing that bypass logic can NEVER activate in a deployed build.
 */
export function isDevAuthBypass(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  return (
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

export const MOCK_DEV_SESSION = {
  accessToken: "mock-preview-token-for-dev-ui-only",
  role: "ADMIN" as const,
  userId: "00000000-0000-0000-0000-000000000001",
};

