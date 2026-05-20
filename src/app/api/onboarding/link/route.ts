import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members, authAccounts } from "@ravxd/velocitydb";
import { syncRosterIfStale } from "@/lib/sync";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, name: discordUsername } = session.user;

    const { battletag } = await req.json();
    if (!battletag || typeof battletag !== "string") {
        return NextResponse.json(
            { error: "Invalid battletag" },
            { status: 400 },
        );
    }

    await syncRosterIfStale("onboarding");
    const db = getDb();

    // session.user.id is the Discord snowflake — look up the authUsers UUID for the FK
    const [account] = await db
        .select({ authUserId: authAccounts.userId })
        .from(authAccounts)
        .where(and(eq(authAccounts.providerAccountId, userId), eq(authAccounts.provider, "discord")))
        .limit(1);

    if (!account) {
        return NextResponse.json({ error: "Auth account not found" }, { status: 400 });
    }
    const normalized = battletag.trim().toLowerCase();

    // Try to find an unclaimed WoWUtils member with a matching battletag
    const match = await db
        .select()
        .from(members)
        .where(eq(members.linkStatus, "unlinked"))
        .then((rows) =>
            rows.find((m) => m.battletag?.toLowerCase() === normalized),
        );

    if (match) {
        await db
            .update(members)
            .set({
                userId: account.authUserId,
                discordId: userId,
                discordUsername: discordUsername ?? "",
                battletag: battletag.trim(),
                linkStatus: "linked",
                updatedAt: new Date(),
            })
            .where(eq(members.id, match.id));

        return NextResponse.json({ linked: true });
    }

    // No match — return the list of unclaimed members for the user to pick from
    const unclaimed = await db
        .select({
            id: members.id,
            wowutilsMemberId: members.wowutilsMemberId,
            displayName: members.displayName,
            battletag: members.battletag,
            rank: members.wowutilsRank,
        })
        .from(members)
        .where(eq(members.linkStatus, "unlinked"));

    return NextResponse.json({ linked: false, unclaimed });
}
