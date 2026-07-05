"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listAdminAuditLog } from "@/lib/api/admin-api";
import type { AdminAuditLogEntry } from "@/lib/types/admin";

export function AdminAuditPanel() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listAdminAuditLog(100));
    } catch {
      setError("Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listAdminAuditLog(100)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load audit log.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Loading audit log…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">{entry.actorEmail}</td>
                <td className="px-4 py-3 font-medium">{entry.action}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.targetType}
                  {entry.targetId ? ` · ${entry.targetId}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit events yet.</p>
      ) : null}
    </div>
  );
}
