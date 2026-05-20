const BASE = "https://api.wowutils.com/v1";

export interface WowutilsCharacter {
  playerId: string;
  name: string;
  realm: string;
  class: string;
  spec: string;
  status: string;
  inactive: boolean;
  order: number;
}

export interface WowutilsMember {
  memberId: string;
  displayName: string;
  alias: string | null;
  battletag: string | null;
  rank: string | null;
  mainRole: string | null;
  mainCharacter: string | null;
  characters: WowutilsCharacter[];
}

export interface WowutilsRoster {
  members: WowutilsMember[];
}

async function wowutilsFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.WOWUTILS_API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`WoWUtils API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchRoster(): Promise<WowutilsMember[]> {
  const groupId = process.env.WOWUTILS_GROUP_ID;
  if (!groupId) throw new Error("WOWUTILS_GROUP_ID is not set");

  const data = await wowutilsFetch<WowutilsRoster>(
    `/groups/${groupId}/roster`
  );
  return data.members;
}
