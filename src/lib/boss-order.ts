// Boss column order, saved per setup tab. Keyed by raid tier id so each tier
// remembers its own arrangement independently in the same JSON column.
export type BossOrderMap = Record<string, string[]>;

// Rows saved before tier support existed stored a plain string[] for the
// 11.1 tier, the only one that existed at the time.
const LEGACY_TIER_ID = "11.1";

export function parseBossOrderMap(raw: string | null | undefined): BossOrderMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const slugs = parsed.filter((s): s is string => typeof s === "string");
      return slugs.length ? { [LEGACY_TIER_ID]: slugs } : {};
    }
    if (parsed && typeof parsed === "object") {
      const result: BossOrderMap = {};
      for (const [tierId, slugs] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(slugs)) {
          result[tierId] = slugs.filter((s): s is string => typeof s === "string");
        }
      }
      return result;
    }
  } catch {
    // ignore malformed
  }
  return {};
}

export function encodeBossOrderMap(map: BossOrderMap): string {
  return JSON.stringify(map);
}
