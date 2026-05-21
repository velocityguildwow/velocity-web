import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members } from "@ravxd/velocitydb";

async function getCallerMember(discordId: string) {
    const db = getDb();
    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, discordId))
        .limit(1);
    return member;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const caller = await getCallerMember(session.user.id);
    if (!caller?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: memberId } = await params;
    const { isAdmin } = await req.json();

    if (typeof isAdmin !== "boolean") {
        return NextResponse.json({ error: "isAdmin must be a boolean" }, { status: 400 });
    }

    // Prevent self-demotion
    if (caller.id === memberId && !isAdmin) {
        return NextResponse.json({ error: "You cannot remove your own admin status" }, { status: 400 });
    }

    const db = getDb();
    const result = await db
        .update(members)
        .set({ isAdmin, updatedAt: new Date() })
        .where(eq(members.id, memberId))
        .returning({ id: members.id });

    if (!result.length) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
}
