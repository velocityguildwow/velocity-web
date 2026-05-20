"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const CLASS_COLORS: Record<string, string> = {
    "Death Knight": "#C41E3A",
    "Demon Hunter": "#A330C9",
    "Druid":        "#FF7C0A",
    "Evoker":       "#33937F",
    "Hunter":       "#AAD372",
    "Mage":         "#3FC7EB",
    "Monk":         "#00FF98",
    "Paladin":      "#F48CBA",
    "Priest":       "#C2C2C2",
    "Rogue":        "#FFF468",
    "Shaman":       "#0070DD",
    "Warlock":      "#8788EE",
    "Warrior":      "#C69B3A",
};

const RANK_ORDER: Record<string, number> = {
    "Guild Master": 0,
    "Guildmaster":  0,
    "GM":           0,
    "Officer":      1,
    "Raider":       2,
    "Member":       3,
    "Trial":        4,
};

function rankPriority(rank: string | null) {
    if (!rank) return 99;
    return RANK_ORDER[rank] ?? 5;
}

export interface RosterCharacter {
    id: string;
    name: string;
    class: string;
    spec: string;
    itemLevel: number | null;
    isMain: boolean;
    isReady: boolean | null;
}

export interface RosterMember {
    id: string;
    displayName: string;
    discordUsername: string;
    discordImage: string | null;
    wowutilsRank: string | null;
    characters: RosterCharacter[];
}

interface RosterTableProps {
    members: RosterMember[];
    currentMemberId: string;
    isAdmin: boolean;
}

export function RosterTable({ members: initial, currentMemberId, isAdmin }: RosterTableProps) {
    const [charReady, setCharReady] = useState<Record<string, boolean>>(() => {
        const map: Record<string, boolean> = {};
        for (const m of initial) {
            for (const c of m.characters) map[c.id] = c.isReady ?? false;
        }
        return map;
    });
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [, startTransition] = useTransition();

    function toggleCollapsed(memberId: string) {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(memberId)) next.delete(memberId);
            else next.add(memberId);
            return next;
        });
    }

    const sorted = [...initial].sort((a, b) => {
        const rd = rankPriority(a.wowutilsRank) - rankPriority(b.wowutilsRank);
        if (rd !== 0) return rd;
        return a.displayName.localeCompare(b.displayName);
    });

    function toggleReady(characterId: string, memberId: string, current: boolean) {
        if (!isAdmin && memberId !== currentMemberId) return;
        const next = !current;
        setCharReady((prev) => ({ ...prev, [characterId]: next }));
        startTransition(async () => {
            const res = await fetch("/api/roster/ready", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ characterId, isReady: next }),
            });
            if (!res.ok) {
                setCharReady((prev) => ({ ...prev, [characterId]: current }));
            }
        });
    }

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Character</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Spec</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Class</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">iLvl</th>
                        <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-16">Done</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((member) => {
                        const chars = [...member.characters].sort((a, b) =>
                            a.isMain === b.isMain ? a.name.localeCompare(b.name) : a.isMain ? -1 : 1
                        );
                        const canToggle = isAdmin || member.id === currentMemberId;
                        const isCollapsed = collapsed.has(member.id);

                        return (
                            <Fragment key={member.id}>
                                {/* Player group header — clickable to collapse */}
                                <tr
                                    key={`hdr-${member.id}`}
                                    className="border-b border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleCollapsed(member.id)}
                                >
                                    <td colSpan={5} className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            {isCollapsed
                                                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            }
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.discordImage ?? undefined} />
                                                <AvatarFallback className="text-[10px]">
                                                    {member.displayName.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-semibold text-foreground">
                                                {member.displayName}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                @{member.discordUsername}
                                            </span>
                                            {member.wowutilsRank && (
                                                <Badge variant="secondary" className="text-xs ml-auto">
                                                    {member.wowutilsRank}
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* Character rows — hidden when collapsed */}
                                {!isCollapsed && (
                                    chars.length === 0 ? (
                                        <tr key={`empty-${member.id}`} className="border-b border-border/40">
                                            <td colSpan={5} className="px-8 py-2 text-xs text-muted-foreground">
                                                No characters
                                            </td>
                                        </tr>
                                    ) : (
                                        chars.map((c) => {
                                            const color = CLASS_COLORS[c.class];
                                            const ready = charReady[c.id] ?? c.isReady ?? false;
                                            console.log(c)
                                            return (
                                                <tr
                                                    key={c.id}
                                                    className="border-b border-border/40 last:border-b-0 transition-colors"
                                                    style={color ? { backgroundColor: `${color}18` } : undefined}
                                                >
                                                    <td className="px-8 py-2 font-medium">
                                                        {c.name}
                                                        {c.isMain && (
                                                            <span className="ml-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                                                                main
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td
                                                        className="px-4 py-2 hidden sm:table-cell"
                                                        style={color ? { color } : undefined}
                                                    >
                                                        {c.spec}
                                                    </td>
                                                    <td
                                                        className="px-4 py-2 hidden sm:table-cell"
                                                        style={color ? { color } : undefined}
                                                    >
                                                        {c.class}
                                                    </td>
                                                    <td className="px-4 py-2 tabular-nums text-muted-foreground">
                                                        {c.itemLevel ?? "—"}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <Checkbox
                                                            checked={ready}
                                                            disabled={!canToggle}
                                                            onCheckedChange={() => toggleReady(c.id, member.id, ready)}
                                                            aria-label={`Mark ${c.name} as done`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
