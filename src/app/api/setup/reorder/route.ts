import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, setups } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

async function requireAdmin(discordId: string) {
    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, discordId))
        .limit(1);
    return member?.isAdmin ? member : null;
}

export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await requireAdmin(session.user.id);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { order } = await req.json();
    if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
        return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }

    await Promise.all(
        (order as string[]).map((id, idx) =>
            db.update(setups).set({ sortOrder: idx }).where(eq(setups.id, id))
        )
    );

    return NextResponse.json({ ok: true });
}
