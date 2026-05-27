import { eq, asc, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    members,
    characters,
    setups,
    setupAssignments,
    setupBossOrder,
    requests,
    afkEntries,
    authUsers,
    getCurrentWeekStart,
    formatWeekRange,
} from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { SetupTable } from "@/components/setup-table";

export const dynamic = "force-dynamic";

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
}

function getAdjacentWeek(weekStart: string, direction: 1 | -1): string {
    return addDays(weekStart, direction * 7);
}

export default async function SetupPage({
    searchParams,
}: {
    searchParams: Promise<{ week?: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { week } = await searchParams;
    const weekStart = week ?? getCurrentWeekStart();


    const [currentMember] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!currentMember) redirect("/onboarding");

    const rows = await db
        .select({
            id: members.id,
            displayName: members.displayName,
            discordUsername: members.discordUsername,
            wowutilsRank: members.wowutilsRank,
            wowutilsMainRole: members.wowutilsMainRole,
            discordImage: authUsers.image,
        })
        .from(members)
        .leftJoin(authUsers, eq(authUsers.id, members.userId))
        .where(eq(members.linkStatus, "linked"))
        .orderBy(asc(members.displayName));

    const allChars = await db
        .select({
            id: characters.id,
            memberId: characters.memberId,
            name: characters.name,
            class: characters.class,
            spec: characters.spec,
            isReady: characters.isReady,
            isMain: characters.isMain,
        })
        .from(characters);

    const charsByMember = new Map<string, typeof allChars>();
    for (const c of allChars) {
        if (!charsByMember.has(c.memberId)) charsByMember.set(c.memberId, []);
        charsByMember.get(c.memberId)!.push(c);
    }

    const setupMembers = rows.map((m) => ({
        ...m,
        discordImage: m.discordImage ?? null,
        wowutilsMainRole: m.wowutilsMainRole ?? null,
        characters: (charsByMember.get(m.id) ?? []).sort((a, b) =>
            a.isMain === b.isMain ? a.name.localeCompare(b.name) : a.isMain ? -1 : 1
        ),
    }));

    const setupList = await db
        .select()
        .from(setups)
        .where(eq(setups.weekStart, weekStart))
        .orderBy(asc(setups.sortOrder), asc(setups.createdAt));

    const assignmentRows = await db
        .select({
            setupId: setupAssignments.setupId,
            memberId: setupAssignments.memberId,
            bossSlug: setupAssignments.bossSlug,
            characterId: setupAssignments.characterId,
        })
        .from(setupAssignments)
        .where(eq(setupAssignments.weekStart, weekStart));

    const assignmentsBySetup = new Map<string, typeof assignmentRows>();
    for (const a of assignmentRows) {
        if (!assignmentsBySetup.has(a.setupId)) assignmentsBySetup.set(a.setupId, []);
        assignmentsBySetup.get(a.setupId)!.push(a);
    }

    const setupData = setupList.map((s) => ({
        id: s.id,
        name: s.name,
        assignments: assignmentsBySetup.get(s.id) ?? [],
    }));

    const setupIds = setupList.map((s) => s.id);
    const bossOrderRows = setupIds.length > 0
        ? await db.select().from(setupBossOrder).where(inArray(setupBossOrder.setupId, setupIds))
        : [];
    const bossOrders: Record<string, string[]> = {};
    for (const row of bossOrderRows) {
        try { bossOrders[row.setupId] = JSON.parse(row.bossOrder); } catch { /* ignore malformed */ }
    }

    // Approved requests for this reset week — these characters get a yellow highlight
    const approvedRequests = await db
        .select({ characterId: requests.characterId })
        .from(requests)
        .where(
            and(
                eq(requests.weekStart, weekStart),
                eq(requests.status, "approved")
            )
        );
    const requestedCharIds = approvedRequests
        .map((r) => r.characterId)
        .filter((id): id is string => id !== null);

    // Raid days for this reset: last day (Tue = weekStart+6), Wed, Thu
    const raidDays = [addDays(weekStart, 6), addDays(weekStart, 7), addDays(weekStart, 8)];

    // Members AFK on any raid day — shown below a divider with red name
    const afkRows = await db
        .select({ memberId: afkEntries.memberId })
        .from(afkEntries)
        .where(inArray(afkEntries.afkDate, raidDays));
    const absentMemberIds = [...new Set(afkRows.map((a) => a.memberId))];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Setup</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Raid roster assignments by boss
                </p>
            </div>

            <SetupTable
                key={weekStart}
                weekStart={weekStart}
                weekLabel={formatWeekRange(weekStart)}
                prevWeekStart={getAdjacentWeek(weekStart, -1)}
                nextWeekStart={getAdjacentWeek(weekStart, 1)}
                isAdmin={currentMember.isAdmin}
                members={setupMembers}
                setups={setupData}
                bossOrders={bossOrders}
                requestedCharIds={requestedCharIds}
                absentMemberIds={absentMemberIds}
            />
        </div>
    );
}
