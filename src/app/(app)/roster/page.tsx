import { eq, asc, max, and, ne, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    getDb,
    members,
    characters,
    requests,
    authUsers,
    syncState,
    getCurrentWeekStart,
    formatWeekRange,
} from "@ravxd/velocitydb";
import { SyncRosterButton } from "@/components/sync-roster-button";
import { RosterTable } from "@/components/roster-table";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

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
            battletag: members.battletag,
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
            itemLevel: characters.itemLevel,
            isMain: characters.isMain,
            isReady: characters.isReady,
        })
        .from(characters);

    const charsByMember = new Map<string, typeof allChars>();
    for (const c of allChars) {
        if (!charsByMember.has(c.memberId)) charsByMember.set(c.memberId, []);
        charsByMember.get(c.memberId)!.push(c);
    }

    const rosterMembers = rows.map((m) => ({
        ...m,
        discordImage: m.discordImage ?? null,
        characters: charsByMember.get(m.id) ?? [],
    }));

    // Upcoming reset: the latest week that has requests, falling back to current week
    const [{ latestWeek }] = await db
        .select({ latestWeek: max(requests.weekStart) })
        .from(requests);
    const upcomingWeek = latestWeek ?? getCurrentWeekStart();

    const weekRequests = await db
        .select({ characterId: requests.characterId })
        .from(requests)
        .where(
            and(eq(requests.weekStart, upcomingWeek), ne(requests.status, "rejected"))
        );
    const requestedCharIds = new Set(
        weekRequests.map((r) => r.characterId).filter(Boolean) as string[]
    );

    const [lastSync] = await db
        .select({ lastSyncedAt: syncState.lastSyncedAt, syncedBy: syncState.syncedBy })
        .from(syncState)
        .orderBy(desc(syncState.lastSyncedAt))
        .limit(1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Roster</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {rows.length} linked members
                    </p>
                </div>
                <SyncRosterButton lastSyncedAt={lastSync?.lastSyncedAt?.toISOString() ?? null} />
            </div>

            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Upcoming Reset:</span>
                <span className="font-medium">{formatWeekRange(upcomingWeek)}</span>
            </div>

            <RosterTable
                members={rosterMembers}
                currentMemberId={currentMember.id}
                isAdmin={currentMember.isAdmin}
                requestedCharIds={requestedCharIds}
            />
        </div>
    );
}
