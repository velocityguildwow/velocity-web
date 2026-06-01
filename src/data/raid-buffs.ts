export interface RaidBuff {
  name: string;
  class: string;
}

export const RAID_BUFFS: RaidBuff[] = [
  { name: "Hunter's Mark", class: "Hunter" },
  { name: "Mark of the Wild", class: "Druid" },
  { name: "Skyfury", class: "Shaman" },
  { name: "Power Word: Fortitude", class: "Priest" },
  { name: "Cosmetic Poison", class: "Rogue" },
  { name: "Blessing of the Bronze", class: "Evoker" },
  { name: "Battle Shout", class: "Warrior" },
  { name: "Arcane Intellect", class: "Mage" },
  { name: "Devotion Aura", class: "Paladin" },
  { name: "Mystic Touch", class: "Monk" },
  { name: "Chaos Brand", class: "Demon Hunter" },
  { name: "Grip", class: "Death Knight" },
  { name: "Healthstone", class: "Warlock" },
];
