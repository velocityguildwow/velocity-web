import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members, requests } from "@ravxd/velocitydb";

// PUT: owner edits their request content (resets to pending)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { notes, classSpec, characterName, characterId } = await req.json();
    if (typeof classSpec !== "string" || !classSpec.trim()) {
        return NextResponse.json({ error: "classSpec is required" }, { status: 400 });
    }
    if (typeof characterName !== "string" || !characterName.trim()) {
        return NextResponse.json({ error: "characterName is required" }, { status: 400 });
    }

    const { id } = await params;

    const condition = member.isAdmin
        ? eq(requests.id, id)
        : and(eq(requests.id, id), eq(requests.memberId, member.id));

    const [existing] = await db.select().from(requests).where(condition).limit(1);
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
        .update(requests)
        .set({
            characterName: characterName.trim(),
            characterId: characterId ?? null,
            notes: notes?.trim() || null,
            classSpec: classSpec.trim(),
            status: "pending",
            adminNote: null,
            updatedAt: new Date(),
        })
        .where(eq(requests.id, id));

    return NextResponse.json({ ok: true });
}

// PATCH: update status (admin only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, adminNote } = await req.json();
    if (!["pending", "approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { id } = await params;
    await db
        .update(requests)
        .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
        .where(eq(requests.id, id));

    return NextResponse.json({ ok: true });
}

// DELETE: remove own request
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Allow deletion if owner or admin
    const condition = member.isAdmin
        ? eq(requests.id, id)
        : and(eq(requests.id, id), eq(requests.memberId, member.id));

    await db.delete(requests).where(condition);

    return NextResponse.json({ ok: true });
}
