"use server";

import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { members, characters, syncState } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { fetchRoster } from "./wowutils";
import { fetchEquippedIlvl } from "./blizzard";

const TTL_MINUTES = Number(process.env.WOWUTILS_SYNC_TTL_MINUTES ?? 5);

export async function syncRosterIfStale(triggeredBy = "system"): Promise<{
    synced: boolean;
    memberCount: number;
}> {

    const [lastSync] = await db
        .select()
        .from(syncState)
        .orderBy(syncState.lastSyncedAt)
        .limit(1);

    if (lastSync) {
        const ageMs = Date.now() - new Date(lastSync.lastSyncedAt).getTime();
        if (ageMs < TTL_MINUTES * 60 * 1000) {
            return { synced: false, memberCount: 0 };
        }
    }

    return syncRoster(triggeredBy);
}

export async function syncRoster(triggeredBy = "system"): Promise<{
    synced: boolean;
    memberCount: number;
}> {
    const roster = await fetchRoster();

    for (const wowMember of roster) {
        await db
            .insert(members)
            .values({
                discordId: `wowutils:${wowMember.memberId}`,
                discordUsername: wowMember.displayName,
                displayName: wowMember.alias ?? wowMember.displayName,
                battletag: wowMember.battletag,
                wowutilsMemberId: wowMember.memberId,
                wowutilsAlias: wowMember.alias,
                wowutilsRank: wowMember.rank,
                wowutilsMainRole: wowMember.mainRole,
                linkStatus: "unlinked",
            })
            .onConflictDoUpdate({
                target: members.wowutilsMemberId,
                set: {
                    displayName: wowMember.alias ?? wowMember.displayName,
                    battletag: wowMember.battletag,
                    wowutilsAlias: wowMember.alias,
                    wowutilsRank: wowMember.rank,
                    wowutilsMainRole: wowMember.mainRole,
                    updatedAt: new Date(),
                },
            });

        const [savedMember] = await db
            .select()
            .from(members)
            .where(eq(members.wowutilsMemberId, wowMember.memberId))
            .limit(1);

        if (!savedMember) continue;

        await Promise.all(
            wowMember.characters.map(async (char) => {
                const itemLevel = await fetchEquippedIlvl(char.name, char.realm);
                await db
                    .insert(characters)
                    .values({
                        memberId: savedMember.id,
                        name: char.name,
                        realm: char.realm,
                        class: char.class,
                        spec: char.spec,
                        status: char.status,
                        isMain: char.status === "main",
                        wowutilsCharacterId: char.playerId,
                        itemLevel,
                    })
                    .onConflictDoUpdate({
                        target: characters.wowutilsCharacterId,
                        set: {
                            name: char.name,
                            realm: char.realm,
                            class: char.class,
                            spec: char.spec,
                            status: char.status,
                            isMain: char.status === "main",
                            itemLevel,
                            updatedAt: new Date(),
                        },
                    });
            })
        );
    }

    const returnedCharacterIds = roster.flatMap((m) =>
        m.characters.map((c) => c.playerId)
    );
    await db.delete(characters).where(
        returnedCharacterIds.length > 0
            ? and(
                  isNotNull(characters.wowutilsCharacterId),
                  notInArray(characters.wowutilsCharacterId, returnedCharacterIds)
              )
            : isNotNull(characters.wowutilsCharacterId)
    );

    await db
        .insert(syncState)
        .values({ syncedBy: triggeredBy })
        .onConflictDoNothing();
    await db
        .update(syncState)
        .set({ lastSyncedAt: new Date(), syncedBy: triggeredBy });

    return { synced: true, memberCount: roster.length };
}
