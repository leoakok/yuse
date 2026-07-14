"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OffsetPagination } from "@/components/ui/offset-pagination";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { listAdminAuditLog } from "@/lib/api/admin-api";
import type { AdminAuditLogEntry } from "@/lib/types/admin";

const PAGE_SIZE = 25;

export function AdminAuditPanel() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listAdminAuditLog(PAGE_SIZE, offset));
    } catch {
      setError("Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

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
          {entries.length} event{entries.length === 1 ? "" : "s"} on this page
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <DataTable minWidth="720px">
        <DataTableHeader>
          <tr>
            <DataTableHead>When</DataTableHead>
            <DataTableHead>Actor</DataTableHead>
            <DataTableHead>Action</DataTableHead>
            <DataTableHead>Target</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {entries.map((entry) => (
            <DataTableRow key={entry.id}>
              <DataTableCell muted>
                {new Date(entry.createdAt).toLocaleString()}
              </DataTableCell>
              <DataTableCell>{entry.actorEmail}</DataTableCell>
              <DataTableCell className="font-medium">{entry.action}</DataTableCell>
              <DataTableCell muted>
                {entry.targetType}
                {entry.targetId ? ` · ${entry.targetId}` : ""}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit events yet.</p>
      ) : (
        <OffsetPagination
          offset={offset}
          pageSize={PAGE_SIZE}
          itemCount={entries.length}
          onOffsetChange={setOffset}
          disabled={loading}
        />
      )}
    </div>
  );
}
