export interface Boss {
  slug: string;
  name: string;
  nickname?: string;
}

export interface RaidTier {
  id: string;
  name: string;
  bosses: Boss[];
}

export const RAID_TIERS: RaidTier[] = [
  {
    id: "11.1",
    name: "Tier 11.1",
    bosses: [
      { slug: "chim", name: "Chim" },
      { slug: "averz", name: "Averz" },
      { slug: "vorasius", name: "Vorasius" },
      { slug: "nexus-king", name: "Nexus King" },
      { slug: "dragons", name: "Dragons" },
      { slug: "paladins", name: "Paladins" },
      { slug: "alleria", name: "Alleria" },
      { slug: "birdie", name: "Birdie" },
      { slug: "lura", name: "Lura" },
      { slug: "rotmire", name: "Rotmire" },
    ],
  },
  {
    id: "11.2",
    name: "The Venomous Abyss",
    bosses: [
      { slug: "nekzali", name: "Nekzali", nickname: "Walmart KT" },
      { slug: "entombed-sentinels", name: "Entombed Sentinels", nickname: "Math" },
      { slug: "lost-explorers", name: "Lost Explorers", nickname: "Ninja Turtles" },
      { slug: "vashnik", name: "Vashnik", nickname: "Totem Trouble" },
      { slug: "sszorak", name: "Sszorak", nickname: "Wind Snake" },
      { slug: "twin-fings", name: "Twin Fings", nickname: "Wiggle Twins" },
      { slug: "coiled-altar", name: "Coiled Altar", nickname: "Ghostbusters" },
      { slug: "ulatek", name: "Ula'tek", nickname: "Egg Slop" },
      { slug: "nymrissa", name: "Nymrissa", nickname: "Wavecaller" },
    ],
  },
];

export const LATEST_TIER = RAID_TIERS[RAID_TIERS.length - 1];
