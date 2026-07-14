"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import {
  approveWaitlistEntry,
  listAdminWaitlist,
  rejectWaitlistEntry,
} from "@/lib/api/admin-api";
import type { WaitlistEntry, WaitlistStatus } from "@/lib/types/admin";

const STATUS_FILTERS: Array<WaitlistStatus | "ALL"> = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function statusBadgeVariant(status: WaitlistStatus) {
  if (status === "APPROVED") return "secondary" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "outline" as const;
}

export function AdminWaitlistPanel() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [filter, setFilter] = useState<WaitlistStatus | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listAdminWaitlist(filter === "ALL" ? undefined : filter));
    } catch {
      setError("Could not load waitlist.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    void listAdminWaitlist(filter === "ALL" ? undefined : filter)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load waitlist.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function review(entry: WaitlistEntry, approve: boolean) {
    setBusyId(entry.id);
    try {
      const updated = approve
        ? await approveWaitlistEntry(entry.id)
        : await rejectWaitlistEntry(entry.id);
      setEntries((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("approval email")
          ? error.message
          : "Could not update waitlist entry.";
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setLoading(true);
              setFilter(status);
            }}
          >
            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading && entries.length === 0 ? (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Loading waitlist…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No waitlist entries in this view.</p>
      ) : (
        <DataTable minWidth="560px">
          <DataTableHeader>
            <tr>
              <DataTableHead>Email</DataTableHead>
              <DataTableHead>Status</DataTableHead>
              <DataTableHead>Submitted</DataTableHead>
              <DataTableHead>Actions</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {entries.map((entry) => (
              <DataTableRow key={entry.id}>
                <DataTableCell>{entry.email}</DataTableCell>
                <DataTableCell>
                  <Badge variant={statusBadgeVariant(entry.status)}>{entry.status}</Badge>
                </DataTableCell>
                <DataTableCell muted>
                  {new Date(entry.submittedAt).toLocaleString()}
                </DataTableCell>
                <DataTableCell>
                  {entry.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === entry.id}
                        onClick={() => void review(entry, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === entry.id}
                        onClick={() => void review(entry, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Reviewed</span>
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
