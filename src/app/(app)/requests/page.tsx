import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { members, requests, characters } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { formatWeekRange } from "@ravxd/velocitydb";
import { Separator } from "@/components/ui/separator";
import { RequestCard } from "@/components/request-card";
import { NewRequestDialog } from "@/components/new-request-dialog";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const rows = await db
        .select({
            request: requests,
            member: {
                id: members.id,
                displayName: members.displayName,
                discordUsername: members.discordUsername,
                wowutilsMainRole: members.wowutilsMainRole,
            },
        })
        .from(requests)
        .innerJoin(members, eq(requests.memberId, members.id))
        .orderBy(desc(requests.weekStart), desc(requests.createdAt));

    // Group by weekStart
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
        const key = row.request.weekStart;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
    }

    const [currentMember] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!currentMember) redirect("/onboarding");

    const memberCharacters = await db
        .select()
        .from(characters)
        .where(eq(characters.memberId, currentMember.id));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Requests</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        What raiders want to play this week
                    </p>
                </div>
                <NewRequestDialog
                    memberId={currentMember.id}
                    characters={memberCharacters}
                />
            </div>

            {grouped.size === 0 && (
                <p className="text-muted-foreground text-sm">
                    No requests yet.
                </p>
            )}

            {Array.from(grouped.entries()).map(([weekStart, weekRows]) => (
                <section key={weekStart}>
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            Week of {formatWeekRange(weekStart)}
                        </h2>
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {weekRows.length} request
                            {weekRows.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {weekRows.map(({ request, member }) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                member={member}
                                isOwner={member.id === currentMember.id}
                                isAdmin={currentMember.isAdmin}
                                characters={member.id === currentMember.id ? memberCharacters : undefined}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
