import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb, members, requests } from "@ravxd/velocitydb";
import { formatWeekRange } from "@ravxd/velocitydb";
import { Separator } from "@/components/ui/separator";
import { AdminRequestCard } from "@/components/admin-request-card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const session = await auth();
    const db = getDb();

    const [currentMember] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session!.user!.id!))
        .limit(1);

    if (!currentMember?.isAdmin) redirect("/");

    const rows = await db
        .select({
            request: requests,
            member: {
                id: members.id,
                displayName: members.displayName,
                discordUsername: members.discordUsername,
            },
        })
        .from(requests)
        .innerJoin(members, eq(requests.memberId, members.id))
        .orderBy(desc(requests.weekStart), desc(requests.createdAt));

    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
        const key = row.request.weekStart;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Admin — Request Review</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Approve or reject requests for each week
                </p>
            </div>

            {grouped.size === 0 && (
                <p className="text-muted-foreground text-sm">
                    No requests to review.
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
                            {
                                weekRows.filter(
                                    (r) => r.request.status === "pending",
                                ).length
                            }{" "}
                            pending
                        </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {weekRows.map(({ request, member }) => (
                            <AdminRequestCard
                                key={request.id}
                                request={request}
                                member={member}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
