type AuthEnvironment = Partial<Record<
  | "NODE_ENV"
  | "BETTER_AUTH_URL"
  | "NEXT_PUBLIC_APP_URL"
  | "VERCEL_URL"
  | "VERCEL_BRANCH_URL"
  | "VERCEL_PROJECT_PRODUCTION_URL",
  string
>>;

function normalizeOrigin(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getTrustedOrigins(environment: AuthEnvironment = process.env) {
  const candidates = [
    environment.BETTER_AUTH_URL,
    environment.NEXT_PUBLIC_APP_URL,
    environment.VERCEL_URL,
    environment.VERCEL_BRANCH_URL,
    environment.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  const origins = candidates
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin) => {
      if (environment.NODE_ENV !== "production") return true;
      const hostname = new URL(origin).hostname;
      return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
    });

  return [...new Set(origins)];
}
