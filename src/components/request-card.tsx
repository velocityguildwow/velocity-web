"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  approved: <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs shrink-0">Approved</Badge>,
  rejected: <Badge variant="outline" className="text-red-500 border-red-500/50 text-xs shrink-0">Rejected</Badge>,
};

export function RequestCard({ request: initial, member, isOwner, isAdmin }: RequestCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [adminNote, setAdminNote] = useState(initial.adminNote ?? "");
  const [confirming, setConfirming] = useState<"approved" | "rejected" | null>(null);
  const [noteText, setNoteText] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function updateStatus(next: "approved" | "rejected" | "pending", note?: string) {
    const res = await fetch(`/api/requests/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, adminNote: note ?? null }),
    });
    if (res.ok) {
      setStatus(next);
      setAdminNote(note ?? "");
      setConfirming(null);
      setNoteText("");
      startTransition(() => router.refresh());
    }
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

  function handleActionClick(action: "approved" | "rejected") {
    if (status === action) {
      updateStatus("pending");
    } else {
      setConfirming(action);
      setNoteText("");
    }
  }

  if (deleted) return null;

  return (
    <Card className={cn("transition-colors relative", statusStyles[status])}>
      {(isAdmin || isOwner) && !confirming && (
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
        {adminNote && status !== "pending" && (
          <p className="text-xs text-muted-foreground pt-1 border-t mt-2 italic">
            Note: {adminNote}
          </p>
        )}

        {isAdmin && confirming && (
          <div className="space-y-2 pt-2">
            <Textarea
              placeholder="Optional note for member…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className={cn(
                  "flex-1 gap-1 text-xs h-7",
                  confirming === "approved" && "bg-green-600 hover:bg-green-700",
                )}
                variant={confirming === "approved" ? "default" : "destructive"}
                disabled={isPending}
                onClick={() => updateStatus(confirming, noteText.trim() || undefined)}
              >
                <Check className="h-3 w-3" />
                Confirm {confirming === "approved" ? "Approval" : "Rejection"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-3"
                disabled={isPending}
                onClick={() => { setConfirming(null); setNoteText(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isAdmin && !confirming && status === "pending" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-400"
              disabled={isPending}
              onClick={() => handleActionClick("approved")}
            >
              <Check className="h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
              disabled={isPending}
              onClick={() => handleActionClick("rejected")}
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        {isAdmin && !confirming && status !== "pending" && (
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs"
              disabled={isPending}
              onClick={() => updateStatus("pending")}
            >
              Undo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
