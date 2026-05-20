"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Character {
  id: string;
  name: string;
  class: string;
  spec: string;
}

interface NewRequestDialogProps {
  memberId: string;
  characters: Character[];
}

export function NewRequestDialog({ memberId, characters }: NewRequestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedCharId, setSelectedCharId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSpec, setCustomSpec] = useState("");
  const [notes, setNotes] = useState("");

  const selectedChar = characters.find((c) => c.id === selectedCharId);
  const isCustom = selectedCharId === "__custom__";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = isCustom
      ? {
          memberId,
          characterName: customName,
          classSpec: customSpec,
          notes: notes || null,
        }
      : {
          memberId,
          characterId: selectedCharId,
          characterName: selectedChar!.name,
          classSpec: `${selectedChar!.class} — ${selectedChar!.spec}`,
          notes: notes || null,
        };

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setOpen(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ New Request</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Character</Label>
            <Select value={selectedCharId} onValueChange={(val) => setSelectedCharId(val ?? "")}>
              <SelectTrigger className="w-full">
                <span className={selectedCharId ? "text-foreground" : "text-muted-foreground"}>
                  {!selectedCharId
                    ? "Pick a character…"
                    : selectedCharId === "__custom__"
                    ? "Other (enter manually)"
                    : `${selectedChar?.name} — ${selectedChar?.spec} ${selectedChar?.class}`}
                </span>
              </SelectTrigger>
              <SelectContent>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.spec} {c.class}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Other (enter manually)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customName">Character Name</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customSpec">Class / Specialization</Label>
                <Input
                  id="customSpec"
                  placeholder="e.g. Protection Warrior"
                  value={customSpec}
                  onChange={(e) => setCustomSpec(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes for the GM…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !selectedCharId || (isCustom && (!customName || !customSpec))}
          >
            {isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
