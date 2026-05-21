"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncRosterButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isLoading = isSyncing || isPending;

  async function handleSync() {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing roster…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(`Roster synced — ${data.memberCount} members`, { id: toastId });
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
  );
}
