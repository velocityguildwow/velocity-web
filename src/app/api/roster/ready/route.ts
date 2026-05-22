import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, characters } from "@ravxd/velocitydb";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { characterId, isReady } = await req.json();
    if (!characterId || typeof isReady !== "boolean") {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }


    const [currentMember] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!currentMember) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [targetChar] = await db
        .select({ memberId: characters.memberId })
        .from(characters)
        .where(eq(characters.id, characterId))
        .limit(1);

    if (!targetChar) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    if (!currentMember.isAdmin && targetChar.memberId !== currentMember.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
        .update(characters)
        .set({ isReady, updatedAt: new Date() })
        .where(eq(characters.id, characterId));

    return NextResponse.json({ ok: true });
}
