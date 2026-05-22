import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, afkEntries } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { afkDate, notes } = await req.json();
    if (!afkDate || typeof afkDate !== "string") {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) {
        return NextResponse.json(
            { error: "Member not found" },
            { status: 404 },
        );
    }

    await db
        .insert(afkEntries)
        .values({ memberId: member.id, afkDate, notes: notes ?? null })
        .onConflictDoNothing();

    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { afkDate } = await req.json();

    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) {
        return NextResponse.json(
            { error: "Member not found" },
            { status: 404 },
        );
    }

    await db
        .delete(afkEntries)
        .where(
            and(
                eq(afkEntries.memberId, member.id),
                eq(afkEntries.afkDate, afkDate),
            ),
        );

    return NextResponse.json({ ok: true });
}
