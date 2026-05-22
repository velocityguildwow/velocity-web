import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { members } from "@ravxd/velocitydb";
import { db } from "@/lib/db";
import { Nav } from "@/components/nav";
import { syncRosterIfStale } from "@/lib/sync";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const [member] = await db
        .select()
        .from(members)
        .where(eq(members.discordId, session.user.id))
        .limit(1);

    // New Discord user — send to onboarding
    if (!member) redirect("/onboarding");

    // Fire-and-forget stale sync (doesn't block page render)
    syncRosterIfStale().catch(console.error);

    return (
        <div className="min-h-screen bg-background relative">
            <div
                className="fixed inset-0 pointer-events-none select-none"
                style={{
                    backgroundImage: "url('/VelocityLogo.png')",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "55%",
                    opacity: 0.035,
                }}
            />
            <Nav
                user={{
                    name: session.user.name,
                    image: session.user.image,
                    isAdmin: member.isAdmin,
                }}
            />
            <main className="relative max-w-[1800px] mx-auto px-4 py-8">{children}</main>
        </div>
    );
}
