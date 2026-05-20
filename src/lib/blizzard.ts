const REGION = process.env.BLIZZARD_REGION ?? "us";
const TOKEN_URL = "https://oauth.battle.net/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.value;
    }

    const clientId = process.env.BLIZZARD_CLIENT_ID;
    const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error(
            "BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET must be set",
        );
    }

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });

    if (!res.ok) {
        throw new Error(`Blizzard token error ${res.status}`);
    }

    const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
    };
    // Refresh 60s before expiry
    cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedToken.value;
}

function toRealmSlug(realm: string): string {
    return realm.toLowerCase().replace(/\s+/g, "-").replace(/'/g, "");
}

export async function fetchEquippedIlvl(
    name: string,
    realm: string,
): Promise<number | null> {
    try {
        const token = await getAccessToken();
        const slug = toRealmSlug(realm);
        const char = encodeURIComponent(name.toLowerCase());
        const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${slug}/${char}?namespace=profile-${REGION}&locale=en_US`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 0 },
        });

        if (!res.ok) return null;

        const data = (await res.json()) as { equipped_item_level?: number };
        return data.equipped_item_level ?? null;
    } catch {
        return null;
    }
}
