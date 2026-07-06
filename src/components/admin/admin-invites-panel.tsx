"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  createInviteLink,
  listAdminInviteLinks,
  updateInviteLink,
} from "@/lib/api/admin-api";
import type { InviteLink } from "@/lib/types/admin";

export function AdminInvitesPanel() {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [emailRestrict, setEmailRestrict] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLinks(await listAdminInviteLinks());
    } catch {
      setError("Could not load invite links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const parsedMaxUses = maxUses.trim() ? Number(maxUses) : undefined;
      const created = await createInviteLink({
        label: label.trim() || undefined,
        emailRestrict: emailRestrict.trim() || undefined,
        maxUses: Number.isFinite(parsedMaxUses) ? parsedMaxUses : undefined,
      });
      setLinks((current) => [created, ...current]);
      setLabel("");
      setEmailRestrict("");
      setMaxUses("");
      toast.success("Invite link created.");
    } catch {
      toast.error("Could not create invite link.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(link: InviteLink) {
    setBusyId(link.id);
    try {
      const updated = await updateInviteLink({
        id: link.id,
        isActive: !link.isActive,
      });
      setLinks((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      toast.error("Could not update invite link.");
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink(link: InviteLink) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${link.urlPath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4 rounded-lg border border-border p-4" onSubmit={(event) => void handleCreate(event)}>
        <h2 className="text-sm font-semibold">Create invite link</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="invite-label" className="text-sm font-medium">
              Label
            </label>
            <Input
              id="invite-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Design beta cohort"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email restrict (optional)
            </label>
            <Input
              id="invite-email"
              type="email"
              value={emailRestrict}
              onChange={(event) => setEmailRestrict(event.target.value)}
              placeholder="friend@example.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-max-uses" className="text-sm font-medium">
              Max uses (optional)
            </label>
            <Input
              id="invite-max-uses"
              inputMode="numeric"
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="10"
            />
          </div>
        </div>
        <Button type="submit" disabled={creating}>
          <Plus />
          {creating ? "Creating…" : "Create invite link"}
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading && links.length === 0 ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Loading invite links…
        </p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invite links yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Restrictions</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{link.label || link.code}</div>
                    <div className="text-muted-foreground">{link.urlPath}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {link.emailRestrict ? `Email: ${link.emailRestrict}` : "Any email"}
                    {link.maxUses != null ? ` · Max ${link.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {link.useCount}
                    {link.maxUses != null ? ` / ${link.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={link.isActive ? "secondary" : "outline"}>
                      {link.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyLink(link)}>
                        <Copy />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === link.id}
                        onClick={() => void toggleActive(link)}
                      >
                        {link.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
