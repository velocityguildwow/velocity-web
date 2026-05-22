import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members, authUsers, authAccounts } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { AdminMembersTable } from "@/components/admin-members-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");


    const [currentMember] = await db
        .select({ id: members.id, isAdmin: members.isAdmin })
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    if (!currentMember?.isAdmin) redirect("/");

    const allMembers = await db
        .select({
            id: members.id,
            displayName: members.displayName,
            discordId: members.discordId,
            discordUsername: members.discordUsername,
            battletag: members.battletag,
            wowutilsMemberId: members.wowutilsMemberId,
            wowutilsRank: members.wowutilsRank,
            linkStatus: members.linkStatus,
            userId: members.userId,
            isAdmin: members.isAdmin,
            linkedUserName: authUsers.name,
            linkedUserImage: authUsers.image,
        })
        .from(members)
        .leftJoin(authUsers, eq(authUsers.id, members.userId))
        .orderBy(asc(members.displayName));

    const discordUsers = await db
        .select({
            id: authUsers.id,
            name: authUsers.name,
            image: authUsers.image,
            discordId: authAccounts.providerAccountId,
        })
        .from(authUsers)
        .innerJoin(authAccounts, eq(authAccounts.userId, authUsers.id))
        .where(eq(authAccounts.provider, "discord"))
        .orderBy(asc(authUsers.name));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Admin</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {allMembers.length} members
                </p>
            </div>
            <AdminMembersTable
                members={allMembers}
                discordUsers={discordUsers}
                currentMemberId={currentMember.id}
            />
        </div>
    );
}
