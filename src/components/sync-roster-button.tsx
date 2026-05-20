"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SyncRosterButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSync() {
    await toast.promise(
      fetch("/api/sync", { method: "POST" }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Sync failed");
        startTransition(() => router.refresh());
        return data;
      }),
      {
        loading: "Syncing roster…",
        success: (data) => `Roster synced — ${data.memberCount} members`,
        error: (err) => err.message ?? "Sync failed. Check your WoWUtils API key.",
      }
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isPending}
      className="gap-2 hover:cursor-pointer"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Syncing…" : "Sync Roster"}
    </Button>
  );
}
