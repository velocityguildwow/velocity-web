import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
    getDb,
    members,
    requests,
    getCurrentWeekStart,
} from "@ravxd/velocitydb";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, characterId, characterName, classSpec, notes } = body;

    const db = getDb();

    // Verify the session user owns this memberId
    const [member] = await db
        .select()
        .from(members)
        .where(
            and(
                eq(members.id, memberId),
                eq(members.discordId, session.user.id),
            ),
        )
        .limit(1);

    if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const weekStart = getCurrentWeekStart();

    await db.insert(requests).values({
        memberId,
        characterId: characterId ?? null,
        characterName,
        classSpec,
        notes: notes ?? null,
        weekStart,
        status: "pending",
    });

    return NextResponse.json({ ok: true });
}
