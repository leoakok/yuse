const DEFAULT_URL = "/api/graphql";

export class SessionInvalidError extends Error {
  constructor() {
    super("Session invalid");
    this.name = "SessionInvalidError";
  }
}

export function getGraphqlUrl(): string {
  if (typeof window === "undefined") {
    const serverUrl = process.env.GRAPHQL_URL?.trim();
    if (serverUrl && /^https?:\/\//i.test(serverUrl)) {
      return serverUrl;
    }
    return "http://localhost:8080/graphql";
  }
  return process.env.NEXT_PUBLIC_GRAPHQL_URL || DEFAULT_URL;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const url = getGraphqlUrl();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401) {
    throw new SessionInvalidError();
  }

  if (response.status === 503) {
    let message = "Backend is unavailable. Start it with: npm run start.";
    try {
      const payload = (await response.json()) as GraphqlResponse<unknown>;
      if (payload.errors?.[0]?.message) {
        message = payload.errors[0].message;
      }
    } catch {
      // response was not JSON
    }
    throw new Error(message);
  }

  const responseText = await response.text();
  let payload: GraphqlResponse<T>;
  try {
    payload = JSON.parse(responseText) as GraphqlResponse<T>;
  } catch {
    if (response.status >= 500) {
      throw new Error(
        responseText.trim() || `Server error (${response.status}). Try again in a moment.`,
      );
    }
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  if (payload.errors?.length) {
    const message = payload.errors.map((e) => e.message).join(", ");
    if (/unauthorized|session invalid|session required/i.test(message)) {
      throw new SessionInvalidError();
    }
    throw new Error(message);
  }

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  if (!payload.data) {
    throw new Error("GraphQL response missing data");
  }
  return payload.data;
}
