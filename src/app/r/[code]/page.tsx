import { backendBaseUrl } from "@/lib/auth/backend-url";
import type { PublicInvitePreview } from "@/lib/types/admin";
import { InviteRedeemPage } from "@/components/invite/invite-redeem-page";

async function fetchInvitePreview(code: string): Promise<PublicInvitePreview | undefined> {
  const base = backendBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/invites/${encodeURIComponent(code)}`, {
      next: { revalidate: 30 },
    });
  } catch {
    return undefined;
  }
  if (response.status === 404) return undefined;
  if (!response.ok) return undefined;
  return (await response.json()) as PublicInvitePreview;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const preview = await fetchInvitePreview(code);
  if (!preview) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Invite not found</h1>
        <p className="mt-2 text-muted-foreground">
          This invite link is invalid or has been removed.
        </p>
      </main>
    );
  }

  return <InviteRedeemPage preview={preview} />;
}
