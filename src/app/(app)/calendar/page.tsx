import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, afkEntries, authUsers } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { AttendanceCalendar } from "@/components/attendance-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
    const session = await auth();

    const rows = await db
        .select({
            entry: afkEntries,
            member: {
                id: members.id,
                displayName: members.displayName,
                discordUsername: members.discordUsername,
                image: authUsers.image,
            },
            memberId: afkEntries.memberId,
        })
        .from(afkEntries)
        .innerJoin(members, eq(afkEntries.memberId, members.id))
        .leftJoin(authUsers, eq(members.userId, authUsers.id));

    const [currentMember] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.discordId, session!.user!.id!))
        .limit(1);

    const entries = rows.map(({ entry, member, memberId }) => ({
        id: entry.id,
        afkDate: entry.afkDate,
        notes: entry.notes,
        memberId,
        member: {
            displayName: member.displayName,
            discordUsername: member.discordUsername,
            image: member.image,
        },
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Attendance</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    See who is unavailable on any given day
                </p>
            </div>
            <AttendanceCalendar
                afkEntries={entries}
                currentMemberId={currentMember.id}
            />
        </div>
    );
}
