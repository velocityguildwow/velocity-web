"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BOSSES } from "@/data/bosses";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetupCharacter {
    id: string;
    name: string;
    class: string;
    spec: string;
    isReady: boolean;
    isMain: boolean;
}

export interface SetupMember {
    id: string;
    displayName: string;
    discordUsername: string;
    discordImage: string | null;
    wowutilsRank: string | null;
    characters: SetupCharacter[];
}

export interface SetupData {
    id: string;
    name: string;
    assignments: {
        setupId: string;
        memberId: string;
        bossSlug: string;
        characterId: string | null;
    }[];
}

interface SetupTableProps {
    weekStart: string;
    weekLabel: string;
    prevWeekStart: string;
    nextWeekStart: string;
    isAdmin: boolean;
    members: SetupMember[];
    setups: SetupData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Assignments state shape: assignments[setupId][memberId][bossSlug] ────────

type AssignmentMap = Record<string, Record<string, Record<string, string | null>>>;

function buildInitialAssignments(setupList: SetupData[]): AssignmentMap {
    const map: AssignmentMap = {};
    for (const setup of setupList) {
        map[setup.id] = {};
        for (const a of setup.assignments) {
            if (!map[setup.id][a.memberId]) map[setup.id][a.memberId] = {};
            map[setup.id][a.memberId][a.bossSlug] = a.characterId;
        }
    }
    return map;
}

// ─── Cell dropdown ────────────────────────────────────────────────────────────

function AssignmentCell({
    setupId,
    memberId,
    bossSlug,
    value,
    characters,
    usedCharIds,
    isAdmin,
    onChange,
}: {
    setupId: string;
    memberId: string;
    bossSlug: string;
    value: string | null | undefined;
    characters: SetupCharacter[];
    usedCharIds: Set<string>;
    isAdmin: boolean;
    onChange: (setupId: string, memberId: string, bossSlug: string, charId: string | null) => void;
}) {
    const currentValue = value ?? null;

    if (!isAdmin) {
        const char = characters.find((c) => c.id === currentValue);
        if (!char) {
            return <span className="text-xs text-muted-foreground px-1">—</span>;
        }
        const color = CLASS_COLORS[char.class];
        return (
            <span className="text-xs font-medium px-1 truncate max-w-[120px]" style={color ? { color } : undefined}>
                {char.name}
                {char.isReady && <span className="ml-1 text-green-400">•</span>}
            </span>
        );
    }

    return (
        <Select
            value={currentValue ?? ""}
            onValueChange={(val) => onChange(setupId, memberId, bossSlug, val || null)}
        >
            <SelectTrigger
                size="sm"
                className="h-7 text-xs min-w-[110px] max-w-[140px] border-border/50 bg-background/50"
            >
                <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent align="start">
                <SelectItem value="">
                    <span className="text-muted-foreground">— Unassigned</span>
                </SelectItem>
                {characters.map((char) => {
                    const inUse = usedCharIds.has(char.id) && char.id !== currentValue;
                    const color = CLASS_COLORS[char.class];
                    return (
                        <SelectItem key={char.id} value={char.id} disabled={inUse}>
                            <span
                                className="truncate"
                                style={color && !inUse ? { color } : undefined}
                            >
                                {char.name}
                            </span>
                            {char.isReady && !inUse && (
                                <span className="text-green-400 text-[10px]">✓</span>
                            )}
                            {inUse && (
                                <span className="text-muted-foreground/50 text-[10px]"> (in use)</span>
                            )}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function RenameInput({
    initialValue,
    onSave,
    onCancel,
}: {
    initialValue: string;
    onSave: (name: string) => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.select();
    }, []);

    return (
        <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") onSave(value.trim() || initialValue);
                if (e.key === "Escape") onCancel();
            }}
            onBlur={() => onSave(value.trim() || initialValue)}
            className="bg-transparent border-b border-ring outline-none text-sm font-medium w-24 text-foreground"
            autoFocus
        />
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SetupTable({
    weekStart,
    weekLabel,
    prevWeekStart,
    nextWeekStart,
    isAdmin,
    members,
    setups: initialSetups,
}: SetupTableProps) {
    const [setupList, setSetupList] = useState(initialSetups);
    const [activeTabId, setActiveTabId] = useState<string | null>(
        initialSetups[0]?.id ?? null
    );
    const [assignments, setAssignments] = useState<AssignmentMap>(
        buildInitialAssignments(initialSetups)
    );
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const sortedMembers = useMemo(
        () =>
            [...members].sort((a, b) => {
                const rd = rankPriority(a.wowutilsRank) - rankPriority(b.wowutilsRank);
                return rd !== 0 ? rd : a.displayName.localeCompare(b.displayName);
            }),
        [members]
    );

    // All characterIds currently assigned across ALL setups in this reset
    const usedCharIds = useMemo(() => {
        const used = new Set<string>();
        for (const setupAssignments of Object.values(assignments)) {
            for (const memberAssignments of Object.values(setupAssignments)) {
                for (const charId of Object.values(memberAssignments)) {
                    if (charId) used.add(charId);
                }
            }
        }
        return used;
    }, [assignments]);

    function handleAssignmentChange(
        setupId: string,
        memberId: string,
        bossSlug: string,
        charId: string | null
    ) {
        const prev = assignments[setupId]?.[memberId]?.[bossSlug] ?? null;

        setAssignments((cur) => ({
            ...cur,
            [setupId]: {
                ...cur[setupId],
                [memberId]: {
                    ...cur[setupId]?.[memberId],
                    [bossSlug]: charId,
                },
            },
        }));

        startTransition(async () => {
            const res = await fetch(`/api/setup/${setupId}/assignments`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, bossSlug, characterId: charId }),
            });

            if (!res.ok) {
                setAssignments((cur) => ({
                    ...cur,
                    [setupId]: {
                        ...cur[setupId],
                        [memberId]: {
                            ...cur[setupId]?.[memberId],
                            [bossSlug]: prev,
                        },
                    },
                }));
                const data = await res.json().catch(() => ({}));
                toast.error(data.error ?? "Failed to save assignment");
            }
        });
    }

    function handleCreateSetup() {
        startTransition(async () => {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ weekStart }),
            });

            if (!res.ok) {
                toast.error("Failed to create setup");
                return;
            }

            const newSetup = await res.json();
            setSetupList((prev) => [...prev, { id: newSetup.id, name: newSetup.name, assignments: [] }]);
            setAssignments((prev) => ({ ...prev, [newSetup.id]: {} }));
            setActiveTabId(newSetup.id);
        });
    }

    function handleRename(id: string, name: string) {
        setRenamingId(null);
        if (!name.trim()) return;

        setSetupList((prev) =>
            prev.map((s) => (s.id === id ? { ...s, name } : s))
        );

        startTransition(async () => {
            const res = await fetch(`/api/setup/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) toast.error("Failed to rename setup");
        });
    }

    function handleDeleteSetup(id: string) {
        const idx = setupList.findIndex((s) => s.id === id);
        const next = setupList[idx - 1] ?? setupList[idx + 1] ?? null;

        setSetupList((prev) => prev.filter((s) => s.id !== id));
        setAssignments((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
        if (activeTabId === id) setActiveTabId(next?.id ?? null);

        startTransition(async () => {
            const res = await fetch(`/api/setup/${id}`, { method: "DELETE" });
            if (!res.ok) toast.error("Failed to delete setup");
        });
    }

    const activeSetup = setupList.find((s) => s.id === activeTabId);
    const activeAssignments = activeTabId ? (assignments[activeTabId] ?? {}) : {};

    return (
        <div className="space-y-4">
            {/* Week navigation */}
            <div className="flex items-center gap-3 text-sm">
                <Link
                    href={`/setup?week=${prevWeekStart}`}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    aria-label="Previous week"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="font-medium min-w-[160px] text-center">{weekLabel}</span>
                <Link
                    href={`/setup?week=${nextWeekStart}`}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    aria-label="Next week"
                >
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 flex-wrap">
                {setupList.map((setup) => (
                    <div
                        key={setup.id}
                        className={`group flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors border ${
                            activeTabId === setup.id
                                ? "bg-muted border-border font-medium text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        onClick={() => setActiveTabId(setup.id)}
                    >
                        {renamingId === setup.id ? (
                            <RenameInput
                                initialValue={setup.name}
                                onSave={(name) => handleRename(setup.id, name)}
                                onCancel={() => setRenamingId(null)}
                            />
                        ) : (
                            <>
                                <span>{setup.name}</span>
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRenamingId(setup.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background"
                                            aria-label="Rename setup"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSetup(setup.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20 hover:text-destructive"
                                            aria-label="Delete setup"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                ))}

                {isAdmin && (
                    <button
                        onClick={handleCreateSetup}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-dashed border-border/50"
                        aria-label="Add setup"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Setup</span>
                    </button>
                )}
            </div>

            {/* Table */}
            {!activeSetup ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
                    {isAdmin
                        ? 'No setups yet — click "Add Setup" to create one.'
                        : "No setups have been created for this week yet."}
                </div>
            ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                                        Member
                                    </th>
                                    {BOSSES.map((boss) => (
                                        <th
                                            key={boss.slug}
                                            className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap min-w-[130px]"
                                        >
                                            {boss.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMembers.map((member, i) => {
                                    const rowBg = i % 2 === 0 ? "bg-background" : "bg-muted/10";
                                    return (
                                    <tr
                                        key={member.id}
                                        className={`border-b border-border/40 last:border-b-0 ${rowBg}`}
                                    >
                                        {/* Member cell */}
                                        <td className={`px-4 py-2 sticky left-0 z-10 border-r border-border/30 ${rowBg}`}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 shrink-0">
                                                    <AvatarImage src={member.discordImage ?? undefined} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {member.displayName.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium text-foreground truncate max-w-[100px]">
                                                    {member.displayName}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Boss assignment cells */}
                                        {BOSSES.map((boss) => (
                                            <td key={boss.slug} className="px-2 py-1.5 text-center">
                                                <AssignmentCell
                                                    setupId={activeTabId!}
                                                    memberId={member.id}
                                                    bossSlug={boss.slug}
                                                    value={activeAssignments[member.id]?.[boss.slug]}
                                                    characters={member.characters}
                                                    usedCharIds={usedCharIds}
                                                    isAdmin={isAdmin}
                                                    onChange={handleAssignmentChange}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    <span>Ready</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="opacity-50">(in use)</span>
                    <span>Already assigned this reset</span>
                </div>
            </div>
        </div>
    );
}
