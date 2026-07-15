"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OffsetPagination } from "@/components/ui/offset-pagination";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  listAdminUsers,
  setUserActive,
  setUserAiLimits,
  setUserRole,
} from "@/lib/api/admin-api";
import type { AdminUser } from "@/lib/types/admin";

const PAGE_SIZE = 25;

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  }
  return String(n);
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [offset, setOffset] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitsUser, setLimitsUser] = useState<AdminUser | null>(null);
  const [aiEnabledDraft, setAiEnabledDraft] = useState(true);
  const [useDefaultLimit, setUseDefaultLimit] = useState(true);
  const [limitDraft, setLimitDraft] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(
        await listAdminUsers({
          limit: PAGE_SIZE,
          offset,
          query: searchQuery || undefined,
        }),
      );
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [offset, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch() {
    const next = searchDraft.trim();
    setOffset(0);
    setSearchQuery(next);
  }

  function openLimitsDialog(user: AdminUser) {
    setLimitsUser(user);
    setAiEnabledDraft(user.aiEnabled);
    const hasOverride = user.aiMonthlyTokenLimit != null;
    setUseDefaultLimit(!hasOverride);
    setLimitDraft(hasOverride ? String(user.aiMonthlyTokenLimit) : String(user.aiEffectiveLimit));
    setError(null);
  }

  async function toggleActive(user: AdminUser) {
    setBusyId(user.id);
    try {
      const updated = await setUserActive(user.id, !user.isActive);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      setError("Could not update user.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleRole(user: AdminUser) {
    setBusyId(user.id);
    try {
      const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
      const updated = await setUserRole(user.id, nextRole);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      setError("Could not update role.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveLimits() {
    if (!limitsUser) return;
    setSavingLimits(true);
    setError(null);
    try {
      let nextLimit: number | null = null;
      if (!useDefaultLimit) {
        const parsed = Number.parseInt(limitDraft.replace(/,/g, ""), 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError("Enter a valid monthly token limit (0 or higher).");
          setSavingLimits(false);
          return;
        }
        nextLimit = parsed;
      }
      const updated = await setUserAiLimits(limitsUser.id, aiEnabledDraft, nextLimit);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setLimitsUser(null);
    } catch {
      setError("Could not update AI limits.");
    } finally {
      setSavingLimits(false);
    }
  }

  if (loading && users.length === 0 && !searchQuery) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Loading users…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch();
        }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search email or name"
            className="max-w-sm"
            aria-label="Search users"
          />
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            <Search className="size-4" />
            Search
          </Button>
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => {
                setSearchDraft("");
                setSearchQuery("");
                setOffset(0);
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length === 1 ? "" : "s"} on this page
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable minWidth="920px">
        <DataTableHeader>
          <tr>
            <DataTableHead>Email</DataTableHead>
            <DataTableHead>Name</DataTableHead>
            <DataTableHead>Role</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Used (month)</DataTableHead>
            <DataTableHead>Limit</DataTableHead>
            <DataTableHead>AI</DataTableHead>
            <DataTableHead>Joined</DataTableHead>
            <DataTableHead className="w-12">
              <span className="sr-only">Actions</span>
            </DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {users.map((user) => (
            <DataTableRow key={user.id}>
              <DataTableCell>{user.email}</DataTableCell>
              <DataTableCell>{user.displayName}</DataTableCell>
              <DataTableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </DataTableCell>
              <DataTableCell>
                <Badge variant={user.isActive ? "secondary" : "destructive"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </DataTableCell>
              <DataTableCell muted>
                {formatTokens(user.aiTokensUsedThisMonth)}
                {user.aiRequestsThisMonth > 0
                  ? ` (${user.aiRequestsThisMonth} req)`
                  : null}
              </DataTableCell>
              <DataTableCell muted>
                {user.aiMonthlyTokenLimit == null
                  ? `${formatTokens(user.aiEffectiveLimit)} (default)`
                  : formatTokens(user.aiEffectiveLimit)}
              </DataTableCell>
              <DataTableCell>
                <Badge variant={user.aiEnabled ? "secondary" : "destructive"}>
                  {user.aiEnabled ? "On" : "Off"}
                </Badge>
              </DataTableCell>
              <DataTableCell muted>
                {new Date(user.createdAt).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={busyId === user.id}
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Actions for ${user.email}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openLimitsDialog(user)}>
                      AI limits
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={busyId === user.id}
                      onClick={() => void toggleActive(user)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={busyId === user.id}
                      onClick={() => void toggleRole(user)}
                    >
                      {user.role === "ADMIN" ? "Demote" : "Make admin"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {users.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">
          {searchQuery ? "No users match that search." : "No users yet."}
        </p>
      ) : (
        <OffsetPagination
          offset={offset}
          pageSize={PAGE_SIZE}
          itemCount={users.length}
          onOffsetChange={setOffset}
          disabled={loading}
        />
      )}

      <ResponsiveDialog
        open={limitsUser != null}
        onOpenChange={(open) => {
          if (!open) setLimitsUser(null);
        }}
      >
        <ResponsiveDialogContent dialogClassName="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>AI limits</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {limitsUser
                ? `Control AI access for ${limitsUser.email}. Used this month: ${formatTokens(limitsUser.aiTokensUsedThisMonth)} of ${formatTokens(limitsUser.aiEffectiveLimit)}.`
                : "Control AI access for this user."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">AI enabled</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to block all AI for this account.
                </p>
              </div>
              <Button
                type="button"
                variant={aiEnabledDraft ? "default" : "outline"}
                size="sm"
                onClick={() => setAiEnabledDraft((v) => !v)}
              >
                {aiEnabledDraft ? "On" : "Off"}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium" id="ai-limit-mode-label">
                Monthly token limit
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={useDefaultLimit ? "default" : "outline"}
                  onClick={() => setUseDefaultLimit(true)}
                >
                  Use default
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!useDefaultLimit ? "default" : "outline"}
                  onClick={() => setUseDefaultLimit(false)}
                >
                  Custom
                </Button>
              </div>
              {!useDefaultLimit ? (
                <Input
                  id="ai-limit-mode"
                  aria-labelledby="ai-limit-mode-label"
                  inputMode="numeric"
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                  placeholder="e.g. 100000"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Platform default applies when no custom limit is set.
                </p>
              )}
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setLimitsUser(null)} disabled={savingLimits}>
              Cancel
            </Button>
            <Button onClick={() => void saveLimits()} disabled={savingLimits}>
              {savingLimits ? "Saving…" : "Save"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
