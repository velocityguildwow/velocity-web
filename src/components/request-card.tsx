"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RequestCardProps {
  request: {
    id: string;
    characterName: string;
    classSpec: string;
    notes: string | null;
    adminNote: string | null;
    status: "pending" | "approved" | "rejected";
  };
  member: {
    id: string;
    displayName: string;
    discordUsername: string;
    wowutilsMainRole: string | null;
  };
  isOwner: boolean;
  isAdmin: boolean;
}

const statusStyles = {
  pending: "border-border",
  approved: "border-green-500/50 bg-green-500/5",
  rejected: "border-red-500/50 bg-red-500/5",
};

const statusBadge = {
  pending: null,
  approved: <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs">Approved</Badge>,
  rejected: <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs">Rejected</Badge>,
};

export function RequestCard({ request: initial, member, isOwner, isAdmin }: RequestCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [deleted, setDeleted] = useState(false);
  const [, startTransition] = useTransition();

  async function updateStatus(next: "approved" | "rejected") {
    const prev = status;
    setStatus(next);
    const res = await fetch(`/api/requests/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) setStatus(prev);
  }

  async function handleDelete() {
    setDeleted(true);
    const res = await fetch(`/api/requests/${initial.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleted(false);
    } else {
      startTransition(() => router.refresh());
    }
  }

  if (deleted) return null;

  return (
    <Card className={cn("transition-colors relative", statusStyles[status])}>
      {(isAdmin || isOwner) && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Delete request"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2 pr-5">
          <div>
            <p className="font-semibold text-sm leading-none">{member.displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">@{member.discordUsername}</p>
          </div>
          {statusBadge[status]}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-1">
        <p className="text-sm font-medium">{initial.characterName}</p>
        <p className="text-xs text-muted-foreground">{initial.classSpec}</p>
        {initial.notes && (
          <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
            {initial.notes}
          </p>
        )}
        {initial.adminNote && status !== "pending" && (
          <p className="text-xs text-muted-foreground pt-1 border-t mt-2 italic">
            Admin: {initial.adminNote}
          </p>
        )}

        {isAdmin && status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-400"
              onClick={() => updateStatus("approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => updateStatus("rejected")}
            >
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
