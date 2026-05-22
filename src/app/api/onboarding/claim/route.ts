import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, authAccounts } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, name: discordUsername } = session.user;

    const { wowutilsMemberId } = await req.json();
    if (!wowutilsMemberId || typeof wowutilsMemberId !== "string") {
        return NextResponse.json(
            { error: "Invalid member ID" },
            { status: 400 },
        );
    }


    // session.user.id is the Discord snowflake — look up the authUsers UUID for the FK
    const [account] = await db
        .select({ authUserId: authAccounts.userId })
        .from(authAccounts)
        .where(and(eq(authAccounts.providerAccountId, userId), eq(authAccounts.provider, "discord")))
        .limit(1);

    if (!account) {
        return NextResponse.json({ error: "Auth account not found" }, { status: 400 });
    }

    const [target] = await db
        .select()
        .from(members)
        .where(
            and(
                eq(members.wowutilsMemberId, wowutilsMemberId),
                eq(members.linkStatus, "unlinked"),
            ),
        )
        .limit(1);

    if (!target) {
        return NextResponse.json(
            { error: "Member not found or already claimed" },
            { status: 404 },
        );
    }

    await db
        .update(members)
        .set({
            userId: account.authUserId,
            discordId: userId,
            discordUsername: discordUsername ?? "",
            linkStatus: "linked",
            updatedAt: new Date(),
        })
        .where(eq(members.id, target.id));

    return NextResponse.json({ ok: true });
}
