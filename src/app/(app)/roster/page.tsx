import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    getDb,
    members,
    characters,
    authUsers,
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Roster</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {rows.length} linked members
                    </p>
                </div>
                {currentMember.isAdmin && <SyncRosterButton />}
            </div>

            <RosterTable
                members={rosterMembers}
                currentMemberId={currentMember.id}
                isAdmin={currentMember.isAdmin}
            />
        </div>
    );
}
