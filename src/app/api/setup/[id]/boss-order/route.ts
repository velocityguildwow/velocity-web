import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, setupBossOrder } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { RAID_TIERS } from "@/data/bosses";
import { parseBossOrderMap, encodeBossOrderMap } from "@/lib/boss-order";

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

    const { bossOrder, tierId } = await req.json();
    if (!Array.isArray(bossOrder) || bossOrder.some((s) => typeof s !== "string")) {
        return NextResponse.json({ error: "Invalid bossOrder" }, { status: 400 });
    }
    if (typeof tierId !== "string" || !RAID_TIERS.some((t) => t.id === tierId)) {
        return NextResponse.json({ error: "Invalid tierId" }, { status: 400 });
    }

    const { id } = await params;

    const [existing] = await db
        .select({ bossOrder: setupBossOrder.bossOrder })
        .from(setupBossOrder)
        .where(eq(setupBossOrder.setupId, id))
        .limit(1);

    const map = parseBossOrderMap(existing?.bossOrder);
    map[tierId] = bossOrder;
    const encoded = encodeBossOrderMap(map);

    await db
        .insert(setupBossOrder)
        .values({ setupId: id, bossOrder: encoded })
        .onConflictDoUpdate({
            target: setupBossOrder.setupId,
            set: { bossOrder: encoded, updatedAt: new Date() },
        });

    return NextResponse.json({ ok: true });
}
