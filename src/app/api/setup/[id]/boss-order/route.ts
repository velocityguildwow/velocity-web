import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, setupBossOrder } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

async function requireAdmin(discordId: string) {
    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, discordId))
        .limit(1);
    return member?.isAdmin ? member : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await requireAdmin(session.user.id);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { bossOrder } = await req.json();
    if (!Array.isArray(bossOrder) || bossOrder.some((s) => typeof s !== "string")) {
        return NextResponse.json({ error: "Invalid bossOrder" }, { status: 400 });
    }

    const { id } = await params;
    const encoded = JSON.stringify(bossOrder);

    await db
        .insert(setupBossOrder)
        .values({ setupId: id, bossOrder: encoded })
        .onConflictDoUpdate({
            target: setupBossOrder.setupId,
            set: { bossOrder: encoded, updatedAt: new Date() },
        });

    return NextResponse.json({ ok: true });
}
