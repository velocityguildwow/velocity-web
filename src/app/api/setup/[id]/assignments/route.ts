import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, setups, setupAssignments } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: setupId } = await params;
    const { memberId, bossSlug, characterId } = await req.json();

    if (!memberId || !bossSlug) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const [setup] = await db
        .select({ weekStart: setups.weekStart })
        .from(setups)
        .where(eq(setups.id, setupId))
        .limit(1);

    if (!setup) return NextResponse.json({ error: "Setup not found" }, { status: 404 });

    try {
        await db
            .insert(setupAssignments)
            .values({
                setupId,
                weekStart: setup.weekStart,
                memberId,
                bossSlug,
                characterId: characterId || null,
            })
            .onConflictDoUpdate({
                target: [setupAssignments.setupId, setupAssignments.memberId, setupAssignments.bossSlug],
                set: { characterId: characterId || null, updatedAt: new Date() },
            });

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        const pg = err as { code?: string };
        if (pg?.code === "23505") {
            return NextResponse.json(
                { error: "Character already assigned in this reset" },
                { status: 409 }
            );
        }
        throw err;
    }
}
