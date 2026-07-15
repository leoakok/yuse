const DEFAULT_BACKEND_GRAPHQL = "http://localhost:8080/graphql";
const VERCEL_BACKEND_PREFIX = "/_/backend";

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

function absoluteHttpUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  return stripTrailingSlashes(trimmed);
}

/**
 * Absolute GraphQL URL for server-side proxy calls.
 * Never use the browser `/api/graphql` path here.
 *
 * Resolution order:
 * 1. GRAPHQL_URL (explicit absolute URL)
 * 2. BACKEND_URL from Vercel experimentalServices (+ /graphql)
 * 3. https://$VERCEL_URL/_/backend/graphql on Vercel
 * 4. local default
 */
export function resolveBackendGraphqlUrl(): string {
  const configured = absoluteHttpUrl(process.env.GRAPHQL_URL);
  if (configured) {
    return configured;
  }

  const backendService = absoluteHttpUrl(process.env.BACKEND_URL);
  if (backendService) {
    return backendService.endsWith("/graphql")
      ? backendService
      : `${backendService}/graphql`;
  }

  const vercelHost = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//i, "");
  if (vercelHost) {
    return `https://${vercelHost}${VERCEL_BACKEND_PREFIX}/graphql`;
  }

  return DEFAULT_BACKEND_GRAPHQL;
}

/** Backend HTTP origin (no `/graphql` suffix) for REST routes such as `/auth/login`. */
export function backendBaseUrl(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "backendBaseUrl is server-only. Call a /api proxy from the browser.",
    );
  }
  return resolveBackendGraphqlUrl().replace(/\/graphql\/?$/, "");
}
