import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncRoster, syncRosterIfStale } from "@/lib/sync";

// GET: auto-sync if stale (called on page load)
export async function GET() {
  const result = await syncRosterIfStale("system");
  return NextResponse.json(result);
}

// POST: force sync (called by admin "Refresh Roster" button)
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncRoster(session.user.name ?? "admin");
  return NextResponse.json(result);
}
