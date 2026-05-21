import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members, authAccounts, authUsers } from "@ravxd/velocitydb";

async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.id) return null;
    const db = getDb();
    const [member] = await db
        .select({ isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);
    return member?.isAdmin ? session : null;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: memberId } = await params;
    const body = await req.json();
    const userId: string | null = body.userId ?? null;

    const db = getDb();

    const [target] = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (!userId) {
        const sentinel = target.wowutilsMemberId
            ? `wowutils:${target.wowutilsMemberId}`
            : `unlinked:${target.id}`;

        await db
            .update(members)
            .set({
                userId: null,
                discordId: sentinel,
                discordUsername: target.displayName,
                linkStatus: "unlinked",
                updatedAt: new Date(),
            })
            .where(eq(members.id, memberId));

        return NextResponse.json({ ok: true });
    }

    const [account] = await db
        .select({ providerAccountId: authAccounts.providerAccountId })
        .from(authAccounts)
        .where(and(eq(authAccounts.userId, userId), eq(authAccounts.provider, "discord")))
        .limit(1);

    if (!account) return NextResponse.json({ error: "User has no Discord account" }, { status: 400 });

    const [user] = await db
        .select({ name: authUsers.name })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);

    const newDiscordId = account.providerAccountId;
    const newDiscordUsername = user?.name ?? newDiscordId;

    // Unlink any other member that owns this Discord snowflake
    const [conflict] = await db
        .select()
        .from(members)
        .where(and(eq(members.discordId, newDiscordId), ne(members.id, memberId)))
        .limit(1);

    if (conflict) {
        const sentinel = conflict.wowutilsMemberId
            ? `wowutils:${conflict.wowutilsMemberId}`
            : `unlinked:${conflict.id}`;
        await db
            .update(members)
            .set({
                userId: null,
                discordId: sentinel,
                discordUsername: conflict.displayName,
                linkStatus: "unlinked",
                updatedAt: new Date(),
            })
            .where(eq(members.id, conflict.id));
    }

    await db
        .update(members)
        .set({
            userId,
            discordId: newDiscordId,
            discordUsername: newDiscordUsername,
            linkStatus: "linked",
            updatedAt: new Date(),
        })
        .where(eq(members.id, memberId));

    return NextResponse.json({ ok: true });
}
