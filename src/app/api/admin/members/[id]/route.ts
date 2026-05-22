import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

async function getCallerMember(discordId: string) {
    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, discordId))
        .limit(1);
    return member;
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const caller = await getCallerMember(session.user.id);
    if (!caller?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: memberId } = await params;

    if (caller.id === memberId) {
        return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const result = await db
        .delete(members)
        .where(eq(members.id, memberId))
        .returning({ id: members.id });

    if (!result.length) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
}
