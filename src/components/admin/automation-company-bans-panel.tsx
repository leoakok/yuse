"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  banAutomationCompany,
  listAutomationCompanyBans,
  unbanAutomationCompany,
} from "@/lib/api/admin-api";
import type { AutomationCompanyBan } from "@/lib/types/admin";
import {
  workspaceRowActionButtonClassName,
  workspaceRowActionsClassName,
  workspaceRowClassName,
  workspaceRowListClassName,
  workspaceSectionHeaderClassName,
} from "@/lib/ui/workspace-section";
import { cn } from "@/lib/utils";

function formatWhen(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString();
}

type AutomationCompanyBansPanelProps = {
  refreshKey?: number;
  embedded?: boolean;
};

export function AutomationCompanyBansPanel({
  refreshKey = 0,
  embedded = false,
}: AutomationCompanyBansPanelProps) {
  const [bans, setBans] = useState<AutomationCompanyBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBans(await listAutomationCompanyBans());
    } catch {
      toast.error("Could not load banned companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleAdd() {
    const name = draft.trim();
    if (!name) {
      toast.error("Enter a company name.");
      return;
    }
    setSaving(true);
    try {
      const created = await banAutomationCompany(name);
      setBans((current) => [created, ...current.filter((row) => row.id !== created.id)]);
      setDraft("");
      toast.success(`${name} banned.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not ban company.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnban(id: string) {
    setBusyId(id);
    try {
      await unbanAutomationCompany(id);
      setBans((current) => current.filter((row) => row.id !== id));
      toast.message("Company unbanned.");
    } catch {
      toast.error("Could not unban company.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {!embedded ? (
        <div className={workspaceSectionHeaderClassName}>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Banned companies</div>
            <p className="text-xs text-muted-foreground">
              Applies to all automations. Banned companies are skipped before matching.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-border/60 px-4 py-3 lg:px-5">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Company name"
          className="h-8 text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAdd();
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0"
          disabled={saving}
          onClick={() => void handleAdd()}
        >
          <Ban className="mr-2 size-3.5" />
          Ban
        </Button>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">Loading bans…</p>
      ) : bans.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground lg:px-5">No banned companies yet.</p>
      ) : (
        <ul className={workspaceRowListClassName}>
          {bans.map((ban) => (
            <li
              key={ban.id}
              className={cn("flex items-center justify-between gap-2", workspaceRowClassName)}
            >
              <div className="min-w-0">
                <div className="font-medium">{ban.companyDisplay}</div>
                <div className="text-xs text-muted-foreground">Added {formatWhen(ban.createdAt)}</div>
              </div>
              <div className={workspaceRowActionsClassName}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-8", workspaceRowActionButtonClassName)}
                  disabled={busyId === ban.id}
                  aria-label={`Unban ${ban.companyDisplay}`}
                  onClick={() => void handleUnban(ban.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
