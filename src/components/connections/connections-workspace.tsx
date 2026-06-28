"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Unlink } from "lucide-react";
import { GitHubMark } from "@/components/brand/github-mark";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CONNECTION_STATUS_QUERY,
  DISCONNECT_CONNECTION_MUTATION,
} from "@/lib/graphql/operations";

type ConnectionStatus = {
  provider: "GITHUB";
  connected: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  connectedAt?: string | null;
};

export function ConnectionsWorkspace() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await graphqlRequest<{ connectionStatus: ConnectionStatus }>(
        CONNECTION_STATUS_QUERY,
        { provider: "GITHUB" },
      );
      setStatus(data.connectionStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load connections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (searchParams.get("connected") === "github") {
      toast.success("GitHub connected");
      void loadStatus();
      window.history.replaceState({}, "", "/connections");
    }
    const error = searchParams.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));
      window.history.replaceState({}, "", "/connections");
    }
  }, [searchParams, loadStatus]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await graphqlRequest<{ disconnectConnection: boolean }>(
        DISCONNECT_CONNECTION_MUTATION,
        { provider: "GITHUB" },
      );
      toast.success("GitHub disconnected");
      await loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect GitHub");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitHubMark className="size-6" />
          GitHub
        </CardTitle>
        <CardDescription>
          Connect GitHub to let the assistant search your repos — including private ones — when
          building your CV. Without a connection, public pages still work via web explore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : status?.connected ? (
          <>
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-3">
              <Avatar size="sm">
                {status.avatarUrl ? (
                  <AvatarImage src={status.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback>
                  <GitHubMark className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Connected as @{status.username ?? "github-user"}
                </p>
                {status.connectedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(status.connectedAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              <Unlink />
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Not connected. You can still import public GitHub profiles — connecting unlocks your
              private repos and higher API limits.
            </p>
            <Button nativeButton={false} render={<a href="/api/auth/github/start" />}>
              <Link2 />
              Connect GitHub
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
