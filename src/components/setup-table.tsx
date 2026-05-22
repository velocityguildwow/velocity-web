"use client";

import React, { useState, useTransition, useRef, useEffect, useMemo } from "react";
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
    wowutilsMainRole: string | null;
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
    requestedCharIds: string[];
    absentMemberIds: string[];
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

const MAX_PER_BOSS = 20;

// ─── Role classification ──────────────────────────────────────────────────────

type PlayerRole = "tank" | "healer" | "melee" | "ranged" | "unknown";

const TANK_SPECS: Record<string, string[]> = {
    "Warrior":      ["Protection"],
    "Paladin":      ["Protection"],
    "Death Knight": ["Blood"],
    "Monk":         ["Brewmaster"],
    "Druid":        ["Guardian"],
    "Demon Hunter": ["Vengeance"],
};

const HEALER_SPECS: Record<string, string[]> = {
    "Paladin":  ["Holy"],
    "Priest":   ["Holy", "Discipline"],
    "Shaman":   ["Restoration"],
    "Druid":    ["Restoration"],
    "Monk":     ["Mistweaver"],
    "Evoker":   ["Preservation"],
};

const MELEE_SPECS: Record<string, string[]> = {
    "Warrior":      ["Arms", "Fury"],
    "Rogue":        ["Assassination", "Outlaw", "Subtlety"],
    "Death Knight": ["Unholy", "Frost"],
    "Demon Hunter": ["Havoc"],
    "Monk":         ["Windwalker"],
    "Paladin":      ["Retribution"],
    "Shaman":       ["Enhancement"],
    "Druid":        ["Feral"],
};

function classifyRole(member: SetupMember): PlayerRole {
    const roleHint = member.wowutilsMainRole?.toLowerCase() ?? "";
    if (roleHint.includes("tank")) return "tank";
    if (roleHint.includes("heal")) return "healer";

    const mainChar = member.characters.find((c) => c.isMain) ?? member.characters[0];
    if (!mainChar) return "unknown";

    if (TANK_SPECS[mainChar.class]?.includes(mainChar.spec)) return "tank";
    if (HEALER_SPECS[mainChar.class]?.includes(mainChar.spec)) return "healer";
    if (MELEE_SPECS[mainChar.class]?.includes(mainChar.spec)) return "melee";
    return "ranged";
}

function rankPriority(rank: string | null) {
    if (!rank) return 99;
    return RANK_ORDER[rank] ?? 5;
}

function bossCountColor(count: number): string {
    if (count < 2) return "text-red-400";
    if (count < 4) return "text-orange-400";
    if (count < 6) return "text-yellow-400";
    return "text-green-400";
}

// ─── Assignments state: [setupId][memberId][bossSlug] ─────────────────────────

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
    requestedCharIds,
    bossCount,
    isAdmin,
    onChange,
}: {
    setupId: string;
    memberId: string;
    bossSlug: string;
    value: string | null | undefined;
    characters: SetupCharacter[];
    usedCharIds: Set<string>;
    requestedCharIds: Set<string>;
    bossCount: number;
    isAdmin: boolean;
    onChange: (setupId: string, memberId: string, bossSlug: string, charId: string | null) => void;
}) {
    const currentValue = value ?? null;

    if (!isAdmin) {
        const char = characters.find((c) => c.id === currentValue);
        if (!char) return <span className="text-xs text-muted-foreground">—</span>;
        const color = CLASS_COLORS[char.class];
        return (
            <div className="flex items-center gap-1">
                <span className="text-xs font-medium" style={color ? { color } : undefined}>
                    {char.name}
                    {char.isReady && <span className="ml-1 text-green-400">•</span>}
                </span>
                {bossCount > 0 && (
                    <span className={`text-xs font-semibold tabular-nums ${bossCountColor(bossCount)}`}>
                        ({bossCount})
                    </span>
                )}
            </div>
        );
    }

    const selectedChar = characters.find((c) => c.id === currentValue);
    const triggerColor = selectedChar ? CLASS_COLORS[selectedChar.class] : undefined;

    return (
        <Select
            value={currentValue ?? ""}
            onValueChange={(val) => onChange(setupId, memberId, bossSlug, val || null)}
        >
            <SelectTrigger
                size="sm"
                className="h-7 text-xs w-full border-border/50"
                style={triggerColor ? { backgroundColor: `${triggerColor}28` } : undefined}
            >
                <SelectValue placeholder="—">
                    {(val: string) => {
                        if (!val) return null;
                        const char = characters.find((c) => c.id === val);
                        if (!char) return null;
                        const color = CLASS_COLORS[char.class];
                        return (
                            <span className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate" style={color ? { color } : undefined}>
                                    {char.name}
                                </span>
                                {bossCount > 0 && (
                                    <span className={`shrink-0 text-xs font-semibold tabular-nums ${bossCountColor(bossCount)}`}>
                                        ({bossCount})
                                    </span>
                                )}
                            </span>
                        );
                    }}
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
                <SelectItem value="" label="—">
                    <span className="text-muted-foreground">— Unassigned</span>
                </SelectItem>
                {characters.map((char) => {
                    const inUse = usedCharIds.has(char.id) && char.id !== currentValue;
                    const isRequested = requestedCharIds.has(char.id);
                    const color = CLASS_COLORS[char.class];
                    return (
                        <SelectItem
                            key={char.id}
                            value={char.id}
                            label={char.name}
                            disabled={inUse}
                            className={isRequested ? "bg-yellow-500/15 focus:bg-yellow-500/25" : undefined}
                        >
                            <span className="truncate" style={color && !inUse ? { color } : undefined}>
                                {char.name}
                            </span>
                            {char.isReady && !inUse && (
                                <span className="text-green-400 text-[10px]">✓</span>
                            )}
                            {inUse && (
                                <span className="text-muted-foreground/50 text-[10px]">(in use)</span>
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

    useEffect(() => { inputRef.current?.select(); }, []);

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
    requestedCharIds,
    absentMemberIds,
}: SetupTableProps) {
    const [setupList, setSetupList] = useState(initialSetups);
    const [activeTabId, setActiveTabId] = useState<string | null>(initialSetups[0]?.id ?? null);
    const [assignments, setAssignments] = useState<AssignmentMap>(buildInitialAssignments(initialSetups));
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const requestedSet = useMemo(() => new Set(requestedCharIds), [requestedCharIds]);
    const absentSet = useMemo(() => new Set(absentMemberIds), [absentMemberIds]);

    const sortedMembers = useMemo(() => {
        const sorted = [...members].sort((a, b) => a.displayName.localeCompare(b.displayName));
        const present = sorted.filter((m) => !absentSet.has(m.id));
        const absent  = sorted.filter((m) =>  absentSet.has(m.id));

        const tanks: SetupMember[] = [];
        const healers: SetupMember[] = [];
        const melee: SetupMember[] = [];
        const ranged: SetupMember[] = [];
        const unknown: SetupMember[] = [];

        for (const m of present) {
            const role = classifyRole(m);
            if (role === "tank")    tanks.push(m);
            else if (role === "healer") healers.push(m);
            else if (role === "melee")  melee.push(m);
            else if (role === "ranged") ranged.push(m);
            else unknown.push(m);
        }

        return { tanks, healers, melee, ranged, unknown, absent };
    }, [members, absentSet]);

    const charIdToName = useMemo(() => {
        const map = new Map<string, string>();
        for (const m of members) {
            for (const c of m.characters) map.set(c.id, c.name);
        }
        return map;
    }, [members]);

    // Per-boss: characterIds already assigned to that boss across ALL setups in this reset.
    // A character cannot appear on the same boss in more than one tab.
    const usedCharsByBoss = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const boss of BOSSES) {
            const used = new Set<string>();
            for (const sa of Object.values(assignments)) {
                for (const ma of Object.values(sa)) {
                    const charId = ma[boss.slug];
                    if (charId) used.add(charId);
                }
            }
            map.set(boss.slug, used);
        }
        return map;
    }, [assignments]);

    const activeAssignments = activeTabId ? (assignments[activeTabId] ?? {}) : {};

    // How many boss slots each character fills in the active tab
    const charBossCountMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const memberAssignments of Object.values(activeAssignments)) {
            for (const charId of Object.values(memberAssignments)) {
                if (charId) map.set(charId, (map.get(charId) ?? 0) + 1);
            }
        }
        return map;
    }, [activeAssignments]);

    // Count assigned characters per boss column for the active tab
    const bossCountMap = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const boss of BOSSES) {
            counts[boss.slug] = Object.values(activeAssignments).filter(
                (ma) => !!ma[boss.slug]
            ).length;
        }
        return counts;
    }, [activeAssignments]);

    // Boss-to-boss diff: for each consecutive pair, which chars were added/removed
    const bossDiffs = useMemo(() => {
        return BOSSES.slice(1).map((boss, i) => {
            const prevBoss = BOSSES[i];
            const prevChars = new Set(
                Object.values(activeAssignments)
                    .map((ma) => ma[prevBoss.slug])
                    .filter((id): id is string => !!id)
            );
            const currChars = new Set(
                Object.values(activeAssignments)
                    .map((ma) => ma[boss.slug])
                    .filter((id): id is string => !!id)
            );
            const removed = [...prevChars].filter((id) => !currChars.has(id));
            const added = [...currChars].filter((id) => !prevChars.has(id));
            return { boss, removed, added };
        });
    }, [activeAssignments]);

    function handleAssignmentChange(setupId: string, memberId: string, bossSlug: string, charId: string | null) {
        const prev = assignments[setupId]?.[memberId]?.[bossSlug] ?? null;
        setAssignments((cur) => ({
            ...cur,
            [setupId]: { ...cur[setupId], [memberId]: { ...cur[setupId]?.[memberId], [bossSlug]: charId } },
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
                    [setupId]: { ...cur[setupId], [memberId]: { ...cur[setupId]?.[memberId], [bossSlug]: prev } },
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
            if (!res.ok) { toast.error("Failed to create setup"); return; }
            const newSetup = await res.json();
            setSetupList((prev) => [...prev, { id: newSetup.id, name: newSetup.name, assignments: [] }]);
            setAssignments((prev) => ({ ...prev, [newSetup.id]: {} }));
            setActiveTabId(newSetup.id);
        });
    }

    function handleRename(id: string, name: string) {
        setRenamingId(null);
        if (!name.trim()) return;
        setSetupList((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
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
        setAssignments((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
        if (activeTabId === id) setActiveTabId(next?.id ?? null);
        startTransition(async () => {
            const res = await fetch(`/api/setup/${id}`, { method: "DELETE" });
            if (!res.ok) toast.error("Failed to delete setup");
        });
    }

    function renderMemberRow(member: SetupMember, i: number, isAbsent: boolean) {
        const rowBg = i % 2 === 0 ? "bg-background" : "bg-muted/10";
        const isOfficer = member.wowutilsRank === "Officer" || (RANK_ORDER[member.wowutilsRank ?? ""] ?? 99) === 0;
        return (
            <tr key={member.id} className={`border-b border-border/40 last:border-b-0 ${rowBg}`}>
                {/* Member name cell */}
                <td className={`px-3 py-1.5 sticky left-0 z-10 border-r border-border/30 ${rowBg}`}>
                    <div className={`flex items-center gap-2 px-2 py-0.5 rounded ${isAbsent ? "bg-red-500/15" : ""} ${isOfficer ? "border-l-2 border-purple-500/70" : ""}`}>
                        <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={member.discordImage ?? undefined} />
                            <AvatarFallback className="text-[9px]">
                                {member.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className={`text-sm font-medium truncate max-w-[110px] ${isAbsent ? "text-red-400" : "text-foreground"}`}>
                            {member.displayName}
                        </span>
                    </div>
                </td>

                {/* Boss assignment cells */}
                {BOSSES.map((boss) => {
                    const charId = activeAssignments[member.id]?.[boss.slug] ?? null;
                    const isRequested = !!charId && requestedSet.has(charId);
                    const bossCount = charId ? (charBossCountMap.get(charId) ?? 1) : 0;
                    return (
                        <td
                            key={boss.slug}
                            className={`px-1.5 py-1 border-l border-border/40 ${isRequested ? "bg-yellow-500/15" : ""}`}
                        >
                            <AssignmentCell
                                setupId={activeTabId!}
                                memberId={member.id}
                                bossSlug={boss.slug}
                                value={charId}
                                characters={member.characters}
                                usedCharIds={usedCharsByBoss.get(boss.slug) ?? new Set()}
                                requestedCharIds={requestedSet}
                                bossCount={bossCount}
                                isAdmin={isAdmin}
                                onChange={handleAssignmentChange}
                            />
                        </td>
                    );
                })}
            </tr>
        );
    }

    const activeSetup = setupList.find((s) => s.id === activeTabId);
    const hasDiffs = bossDiffs.some((d) => d.removed.length > 0 || d.added.length > 0);

    return (
        <div className="space-y-4">
            {/* Week navigation */}
            <div className="flex items-center gap-3 text-sm">
                <Link href={`/setup?week=${prevWeekStart}`} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Previous week">
                    <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="font-medium min-w-[160px] text-center">{weekLabel}</span>
                <Link href={`/setup?week=${nextWeekStart}`} className="p-1 rounded hover:bg-muted transition-colors" aria-label="Next week">
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
                                            onClick={(e) => { e.stopPropagation(); setRenamingId(setup.id); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-background"
                                            aria-label="Rename setup"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSetup(setup.id); }}
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

            {/* Table + diff */}
            {!activeSetup ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
                    {isAdmin
                        ? 'No setups yet — click "Add Setup" to create one.'
                        : "No setups have been created for this week yet."}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground sticky left-0 bg-muted/50 z-10 min-w-[150px]">
                                            Member
                                        </th>
                                        {BOSSES.map((boss) => (
                                            <th key={boss.slug} className="text-center px-2 py-2.5 font-medium text-muted-foreground whitespace-nowrap min-w-[120px] border-l border-border/40">
                                                {boss.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Tanks */}
                                    {sortedMembers.tanks.length > 0 && <>
                                        <tr key="hdr-tanks">
                                            <td colSpan={BOSSES.length + 1} className="px-3 py-1 text-xs font-bold text-foreground/80 bg-muted/30 uppercase tracking-wider">
                                                Tanks
                                            </td>
                                        </tr>
                                        {sortedMembers.tanks.map((m, i) => renderMemberRow(m, i, false))}
                                    </>}

                                    {/* Healers */}
                                    {sortedMembers.healers.length > 0 && <>
                                        <tr key="hdr-healers">
                                            <td colSpan={BOSSES.length + 1} className={`px-3 py-1 text-xs font-bold text-foreground/80 bg-muted/30 uppercase tracking-wider ${sortedMembers.tanks.length > 0 ? "border-t-2 border-border/60" : ""}`}>
                                                Healers
                                            </td>
                                        </tr>
                                        {sortedMembers.healers.map((m, i) => renderMemberRow(m, i, false))}
                                    </>}

                                    {/* DPS super-header + Melee + Ranged */}
                                    {(sortedMembers.melee.length > 0 || sortedMembers.ranged.length > 0) && <>
                                        <tr key="hdr-dps">
                                            <td colSpan={BOSSES.length + 1} className={`px-3 py-1 text-xs font-bold text-foreground/80 bg-muted/30 uppercase tracking-wider ${(sortedMembers.tanks.length > 0 || sortedMembers.healers.length > 0) ? "border-t-2 border-border/60" : ""}`}>
                                                DPS
                                            </td>
                                        </tr>
                                        {sortedMembers.melee.length > 0 && <>
                                            <tr key="hdr-melee">
                                                <td colSpan={BOSSES.length + 1} className="px-4 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/40 bg-muted/10">
                                                    Melee
                                                </td>
                                            </tr>
                                            {sortedMembers.melee.map((m, i) => renderMemberRow(m, i, false))}
                                        </>}
                                        {sortedMembers.ranged.length > 0 && <>
                                            <tr key="hdr-ranged">
                                                <td colSpan={BOSSES.length + 1} className={`px-4 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/40 bg-muted/10 ${sortedMembers.melee.length > 0 ? "border-t border-border/40" : ""}`}>
                                                    Ranged
                                                </td>
                                            </tr>
                                            {sortedMembers.ranged.map((m, i) => renderMemberRow(m, i, false))}
                                        </>}
                                    </>}

                                    {/* Unknown / unclassified */}
                                    {sortedMembers.unknown.length > 0 && <>
                                        <tr key="hdr-other">
                                            <td colSpan={BOSSES.length + 1} className="px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50 bg-muted/20 border-t-2 border-border/60">
                                                Other
                                            </td>
                                        </tr>
                                        {sortedMembers.unknown.map((m, i) => renderMemberRow(m, i, false))}
                                    </>}

                                    {/* Absent */}
                                    {sortedMembers.absent.length > 0 && <>
                                        <tr key="hdr-absent">
                                            <td colSpan={BOSSES.length + 1} className="px-3 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-red-400/60 bg-red-500/5 border-t-2 border-red-500/30">
                                                Absent this reset
                                            </td>
                                        </tr>
                                        {sortedMembers.absent.map((m, i) => renderMemberRow(m, i, true))}
                                    </>}
                                </tbody>
                                <tfoot>
                                    {/* Count row */}
                                    <tr className="border-t border-border bg-muted/30">
                                        <td className="px-3 py-1.5 sticky left-0 bg-muted/30 text-xs font-medium text-muted-foreground">
                                            Total
                                        </td>
                                        {BOSSES.map((boss) => {
                                            const count = bossCountMap[boss.slug] ?? 0;
                                            const over = count > MAX_PER_BOSS;
                                            return (
                                                <td key={boss.slug} className="px-2 py-1.5 text-center border-l border-border/40">
                                                    <span className={`text-xs font-medium tabular-nums ${over ? "text-red-400" : "text-muted-foreground"}`}>
                                                        {count} / {MAX_PER_BOSS}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Diff header */}
                                    {hasDiffs && (
                                        <tr className="border-t border-dashed border-border/60 bg-muted/10">
                                            <td className="px-3 py-1.5 sticky left-0 bg-muted/10 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                Changes
                                            </td>
                                            {BOSSES.map((boss, i) => {
                                                if (i === 0) return <td key={boss.slug} className="px-2 py-1.5 text-xs text-muted-foreground/40 text-center border-l border-border/40">—</td>;
                                                const diff = bossDiffs[i - 1];
                                                const hasChanges = diff.removed.length > 0 || diff.added.length > 0;
                                                if (!hasChanges) return <td key={boss.slug} className="px-2 py-1.5 text-xs text-muted-foreground/40 text-center border-l border-border/40">—</td>;
                                                return (
                                                    <td key={boss.slug} className="px-1 py-1.5 align-top border-l border-border/40">
                                                        <div className="flex gap-0.5 text-[11px]">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Out</div>
                                                                {diff.removed.map((id) => (
                                                                    <div key={id} className="text-red-400 truncate leading-4">
                                                                        {charIdToName.get(id) ?? "?"}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="w-px bg-border/40 mx-0.5 self-stretch" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">In</div>
                                                                {diff.added.map((id) => (
                                                                    <div key={id} className="text-green-400 truncate leading-4">
                                                                        {charIdToName.get(id) ?? "?"}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/30" />
                            <span>Approved request</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/15 border border-red-500/20" />
                            <span>Absent this reset</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-400">✓</span>
                            <span>Ready</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
