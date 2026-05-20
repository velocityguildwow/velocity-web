"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AdminRequestCardProps {
  request: {
    id: string;
    characterName: string;
    classSpec: string;
    notes: string | null;
    adminNote: string | null;
    status: "pending" | "approved" | "rejected";
  };
  member: {
    displayName: string;
    discordUsername: string;
  };
}

const statusStyles = {
  pending: "border-border",
  approved: "border-green-500/50 bg-green-500/5",
  rejected: "border-red-500/50 bg-red-500/5",
};

export function AdminRequestCard({ request, member }: AdminRequestCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [confirming, setConfirming] = useState<"approved" | "rejected" | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isPending, startTransition] = useTransition();

  async function updateStatus(next: "approved" | "rejected" | "pending", note?: string) {
    const res = await fetch(`/api/requests/${request.id}`, {
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

  function handleActionClick(action: "approved" | "rejected") {
    if (status === action) {
      updateStatus("pending");
    } else {
      setConfirming(action);
      setNoteText("");
    }
  }

  return (
    <Card className={cn("transition-colors", statusStyles[status])}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm leading-none">{member.displayName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">@{member.discordUsername}</p>
          </div>
          {status === "approved" && (
            <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs shrink-0">
              Approved
            </Badge>
          )}
          {status === "rejected" && (
            <Badge variant="outline" className="text-red-600 border-red-500/50 text-xs shrink-0">
              Rejected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <p className="text-sm font-medium">{request.characterName}</p>
        <p className="text-xs text-muted-foreground">{request.classSpec}</p>
        {request.notes && (
          <p className="text-xs text-muted-foreground pt-1 border-t">
            {request.notes}
          </p>
        )}
        {adminNote && status !== "pending" && (
          <p className="text-xs text-muted-foreground pt-1 border-t italic">
            Note: {adminNote}
          </p>
        )}

        {confirming ? (
          <div className="space-y-2 pt-1">
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
                  confirming === "approved" && "bg-green-600 hover:bg-green-700"
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
        ) : (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={status === "approved" ? "default" : "outline"}
              className={cn(
                "flex-1 gap-1 text-xs h-7",
                status === "approved" && "bg-green-600 hover:bg-green-700"
              )}
              disabled={isPending}
              onClick={() => handleActionClick("approved")}
            >
              <Check className="h-3 w-3" />
              {status === "approved" ? "Undo" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant={status === "rejected" ? "destructive" : "outline"}
              className="flex-1 gap-1 text-xs h-7"
              disabled={isPending}
              onClick={() => handleActionClick("rejected")}
            >
              <X className="h-3 w-3" />
              {status === "rejected" ? "Undo" : "Reject"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
