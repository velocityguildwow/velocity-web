import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members, setups } from "@ravxd/velocitydb";

async function requireAdmin(discordId: string) {
    const db = getDb();
    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, discordId))
        .limit(1);
    return member?.isAdmin ? member : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await requireAdmin(session.user.id);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

    const { id } = await params;
    const db = getDb();

    const [updated] = await db
        .update(setups)
        .set({ name: name.trim(), updatedAt: new Date() })
        .where(eq(setups.id, id))
        .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await requireAdmin(session.user.id);
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const db = getDb();

    await db.delete(setups).where(eq(setups.id, id));

    return NextResponse.json({ ok: true });
}
