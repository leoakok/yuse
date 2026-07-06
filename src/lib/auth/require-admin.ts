import { auth } from "@/auth";
import { resolveBackendGraphqlUrl } from "@/lib/auth/backend-url";
import { signProxyJwt, AuthConfigError } from "@/lib/auth/proxy-jwt";
import { ME_QUERY } from "@/lib/graphql/operations";
import type { User } from "@/lib/types/user";

export async function fetchCurrentUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  let token: string;
  try {
    token = await signProxyJwt(session);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return null;
    }
    throw error;
  }

  const response = await fetch(resolveBackendGraphqlUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: ME_QUERY }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    data?: { me?: User | null };
  };
  return payload.data?.me ?? null;
}

export async function requireAdminUser(): Promise<User | null> {
  const user = await fetchCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}
