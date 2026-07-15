export async function claimInvite(code: string, email: string): Promise<void> {
  const response = await fetch("/api/auth/claim-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, email }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message?.trim() || "Could not claim invite.");
  }
}

export async function fetchPublicInvite(code: string) {
  const response = await fetch(`/api/invites/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return undefined;
  }
  return response.json();
}
