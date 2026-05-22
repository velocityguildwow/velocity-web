import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

async function requireAdmin() {
    const session = await auth();
    if (!session?.user?.id) return null;
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
    const { battletag } = await req.json();

    if (!battletag || typeof battletag !== "string") {
        return NextResponse.json({ error: "Invalid battletag" }, { status: 400 });
    }

    const result = await db
        .update(members)
        .set({ battletag: battletag.trim(), updatedAt: new Date() })
        .where(eq(members.id, memberId))
        .returning({ id: members.id });

    if (!result.length) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
}
