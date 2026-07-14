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
  listAdminUsers,
  setUserActive,
  setUserRole,
} from "@/lib/api/admin-api";
import type { AdminUser } from "@/lib/types/admin";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listAdminUsers());
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listAdminUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading && users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Loading users…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? "" : "s"}
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

      <DataTable minWidth="640px">
        <DataTableHeader>
          <tr>
            <DataTableHead>Email</DataTableHead>
            <DataTableHead>Name</DataTableHead>
            <DataTableHead>Role</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Joined</DataTableHead>
            <DataTableHead>Actions</DataTableHead>
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
                {new Date(user.createdAt).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === user.id}
                    onClick={() => void toggleActive(user)}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === user.id}
                    onClick={() => void toggleRole(user)}
                  >
                    {user.role === "ADMIN" ? "Demote" : "Make admin"}
                  </Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
