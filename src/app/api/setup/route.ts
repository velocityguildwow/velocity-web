import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, setups, setupAssignments } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const week = req.nextUrl.searchParams.get("week");
    if (!week) return NextResponse.json({ error: "Missing week" }, { status: 400 });


    const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const setupList = await db
        .select()
        .from(setups)
        .where(eq(setups.weekStart, week))
        .orderBy(asc(setups.createdAt));

    const assignments = await db
        .select({
            setupId: setupAssignments.setupId,
            memberId: setupAssignments.memberId,
            bossSlug: setupAssignments.bossSlug,
            characterId: setupAssignments.characterId,
        })
        .from(setupAssignments)
        .where(eq(setupAssignments.weekStart, week));

    return NextResponse.json({ setups: setupList, assignments });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


    const [member] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!member.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { weekStart } = await req.json();
    if (!weekStart) return NextResponse.json({ error: "Missing weekStart" }, { status: 400 });

    const existing = await db
        .select({ id: setups.id })
        .from(setups)
        .where(eq(setups.weekStart, weekStart));

    const name = `Setup ${existing.length + 1}`;

    const [newSetup] = await db
        .insert(setups)
        .values({ weekStart, name })
        .returning();

    return NextResponse.json(newSetup, { status: 201 });
}
