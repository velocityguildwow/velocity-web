"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SyncRosterButton({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);

  const isLoading = isSyncing || isPending;

  async function handleSync() {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing roster…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(`Roster synced — ${data.memberCount} members`, { id: toastId });
      setSyncedAt(new Date().toISOString());
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sync failed. Check your WoWUtils API key.",
        { id: toastId }
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {syncedAt && (
        <span className="text-xs text-muted-foreground">
          Last synced {formatRelative(syncedAt)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isLoading}
        className="gap-2 hover:cursor-pointer"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Syncing…" : "Sync Roster"}
      </Button>
    </div>
  );
}
