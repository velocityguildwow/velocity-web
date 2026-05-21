"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkIcon, PencilIcon } from "lucide-react";

export interface AdminMember {
    id: string;
    displayName: string;
    discordId: string;
    discordUsername: string;
    battletag: string | null;
    wowutilsMemberId: string | null;
    wowutilsRank: string | null;
    linkStatus: "unlinked" | "linked" | "pending";
    userId: string | null;
    isAdmin: boolean;
    linkedUserName: string | null;
    linkedUserImage: string | null;
}

export interface DiscordUser {
    id: string;
    name: string | null;
    image: string | null;
    discordId: string;
}

interface AdminMembersTableProps {
    members: AdminMember[];
    discordUsers: DiscordUser[];
    currentMemberId: string;
}

function LinkDialog({
    member,
    discordUsers,
    onSave,
}: {
    member: AdminMember;
    discordUsers: DiscordUser[];
    onSave: (userId: string | null) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<string | null>(member.userId);
    const [pending, startTransition] = useTransition();

    function handleSave() {
        startTransition(async () => {
            await onSave(selected);
            setOpen(false);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" />
                }
            >
                <LinkIcon className="size-3" />
                {member.linkStatus === "linked" ? "Relink" : "Link"}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link member — {member.displayName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Discord user</Label>
                        <Select
                            value={selected ?? "none"}
                            onValueChange={(v) => setSelected(v === "none" ? null : (v ?? null))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pick a user…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">None (unlink)</span>
                                </SelectItem>
                                {discordUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={u.image ?? undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {u.name?.slice(0, 2).toUpperCase() ?? "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{u.name ?? u.discordId}</span>
                                            <span className="text-muted-foreground text-xs">
                                                {u.discordId}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {member.linkStatus === "linked" && member.linkedUserName && (
                        <p className="text-xs text-muted-foreground">
                            Currently linked to{" "}
                            <span className="font-medium text-foreground">
                                {member.linkedUserName}
                            </span>
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={pending} size="sm">
                        {pending ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BattletagDialog({
    member,
    onSave,
}: {
    member: AdminMember;
    onSave: (battletag: string) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(member.battletag ?? "");
    const [pending, startTransition] = useTransition();

    function handleSave() {
        if (!value.trim()) return;
        startTransition(async () => {
            await onSave(value.trim());
            setOpen(false);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" />
                }
            >
                <PencilIcon className="size-3" />
                {member.battletag ? "Edit" : "Set"}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Battletag — {member.displayName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-1.5">
                    <Label htmlFor="battletag-input">Battletag</Label>
                    <Input
                        id="battletag-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Player#1234"
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    />
                </div>

                <DialogFooter>
                    <Button onClick={handleSave} disabled={pending || !value.trim()} size="sm">
                        {pending ? "Saving…" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AdminMembersTable({ members, discordUsers, currentMemberId }: AdminMembersTableProps) {
    const router = useRouter();

    async function handleAdminToggle(memberId: string, isAdmin: boolean) {
        const res = await fetch(`/api/admin/members/${memberId}/admin-status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isAdmin }),
        });
        if (!res.ok) {
            const { error } = await res.json().catch(() => ({ error: "Failed" }));
            alert(error ?? "Failed to update admin status");
            return;
        }
        router.refresh();
    }

    async function handleLink(memberId: string, userId: string | null) {
        const res = await fetch(`/api/admin/members/${memberId}/link`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error("Failed to update link");
        router.refresh();
    }

    async function handleBattletag(memberId: string, battletag: string) {
        const res = await fetch(`/api/admin/members/${memberId}/battletag`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ battletag }),
        });
        if (!res.ok) throw new Error("Failed to update battletag");
        router.refresh();
    }

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            Member
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                            Battletag
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                            WoWUtils ID
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            Status
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                            Linked user
                        </th>
                        <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-16">
                            Admin
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((m) => (
                        <tr
                            key={m.id}
                            className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                            <td className="px-4 py-2.5">
                                <div className="font-medium">{m.displayName}</div>
                                <div className="text-xs text-muted-foreground">
                                    @{m.discordUsername}
                                </div>
                            </td>

                            <td className="px-4 py-2.5 hidden md:table-cell">
                                <div className="flex items-center gap-1.5">
                                    <span className={m.battletag ? undefined : "text-muted-foreground"}>
                                        {m.battletag ?? "—"}
                                    </span>
                                    <BattletagDialog
                                        member={m}
                                        onSave={(bt) => handleBattletag(m.id, bt)}
                                    />
                                </div>
                            </td>

                            <td className="px-4 py-2.5 hidden lg:table-cell">
                                <span className="font-mono text-xs text-muted-foreground">
                                    {m.wowutilsMemberId ?? "—"}
                                </span>
                            </td>

                            <td className="px-4 py-2.5">
                                <Badge
                                    variant={
                                        m.linkStatus === "linked" ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                >
                                    {m.linkStatus}
                                </Badge>
                            </td>

                            <td className="px-4 py-2.5">
                                {m.userId ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={m.linkedUserImage ?? undefined} />
                                            <AvatarFallback className="text-[9px]">
                                                {m.linkedUserName?.slice(0, 2).toUpperCase() ?? "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{m.linkedUserName}</span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                )}
                            </td>

                            <td className="px-4 py-2.5 text-center">
                                <Checkbox
                                    checked={m.isAdmin}
                                    disabled={m.id === currentMemberId}
                                    onCheckedChange={(checked: boolean) =>
                                        handleAdminToggle(m.id, checked)
                                    }
                                    aria-label={`Admin status for ${m.displayName}`}
                                />
                            </td>

                            <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <LinkDialog
                                        member={m}
                                        discordUsers={discordUsers}
                                        onSave={(userId) => handleLink(m.id, userId)}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
