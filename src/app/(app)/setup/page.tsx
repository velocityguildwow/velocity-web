import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    getDb,
    members,
    characters,
    setups,
    setupAssignments,
    authUsers,
    getCurrentWeekStart,
    formatWeekRange,
} from "@ravxd/velocitydb";
import { SetupTable } from "@/components/setup-table";

export const dynamic = "force-dynamic";

function getAdjacentWeek(weekStart: string, direction: 1 | -1): string {
    const d = new Date(weekStart + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + direction * 7);
    return d.toISOString().split("T")[0];
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

    const db = getDb();

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
        characters: (charsByMember.get(m.id) ?? []).sort((a, b) =>
            a.isMain === b.isMain ? a.name.localeCompare(b.name) : a.isMain ? -1 : 1
        ),
    }));

    const setupList = await db
        .select()
        .from(setups)
        .where(eq(setups.weekStart, weekStart))
        .orderBy(asc(setups.createdAt));

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Setup</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Raid roster assignments by boss
                </p>
            </div>

            <SetupTable
                weekStart={weekStart}
                weekLabel={formatWeekRange(weekStart)}
                prevWeekStart={getAdjacentWeek(weekStart, -1)}
                nextWeekStart={getAdjacentWeek(weekStart, 1)}
                isAdmin={currentMember.isAdmin}
                members={setupMembers}
                setups={setupData}
            />
        </div>
    );
}
