const DEFAULT_BACKEND_GRAPHQL = "http://localhost:8080/graphql";

/** Absolute GraphQL URL for server-side proxy calls — never use the browser `/api/graphql` path. */
export function resolveBackendGraphqlUrl(): string {
  const configured = process.env.GRAPHQL_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  return DEFAULT_BACKEND_GRAPHQL;
}

/** Backend HTTP origin (no `/graphql` suffix) for REST routes such as `/auth/login`. */
export function backendBaseUrl(): string {
  return resolveBackendGraphqlUrl().replace(/\/graphql\/?$/, "");
}
