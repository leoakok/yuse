type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  existing.count += 1;
  return { allowed: true };
}

export function clientIp(request: Request): string {
  if (trustForwardedHeaders()) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) {
        return first;
      }
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp?.trim()) {
      return realIp.trim();
    }
  }
  return "unknown";
}

function trustForwardedHeaders(): boolean {
  const trusted = process.env.TRUSTED_PROXY?.trim().toLowerCase();
  return trusted === "true" || trusted === "1";
}

export const MAX_REGISTER_BODY_BYTES = 16 * 1024;
export const MAX_GRAPHQL_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_ASSISTANT_BODY_BYTES = 14 * 1024 * 1024;

export async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const body = await request.text();
  if (body.length > maxBytes) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }
  return body;
}

export function enforceRateLimit(
  request: Request,
  keyPrefix: string,
  limit: number,
  windowMs: number,
): Response | null {
  const key = `${keyPrefix}:${clientIp(request)}`;
  const result = checkRateLimit({ key, limit, windowMs });
  if (result.allowed) {
    return null;
  }
  return Response.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
