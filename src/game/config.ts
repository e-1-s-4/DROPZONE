import type { Personality, Rarity, WeaponClass, WeaponDef } from "./types";

export const MAP_SIZE = 200;
export const MAP_HALF = MAP_SIZE / 2;
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.72;
export const CROUCH_HEIGHT = 1.18;
export const GRAVITY = 28;
export const JUMP_SPEED = 8.6;
export const WALK_SPEED = 7.4;
export const SPRINT_SPEED = 11.6;
export const CROUCH_SPEED = 3.8;
export const ADS_SPEED_MULT = 0.72;
export const MAX_HEALTH = 100;
export const STAMINA_MAX = 100;
export const TOTAL_AI = 17;
export const INTERACT_RANGE = 2.35;

export const CLASS_ADS_ZOOM: Record<WeaponClass, number> = {
  ar: 12,
  smg: 10,
  shotgun: 10,
  sniper: 26,
  burst: 12,
  pistol: 8,
  lmg: 14,
};

/** Guaranteed high-value spawns at landmarks. */
export const HOT_DROPS: { x: number; z: number; id: string; rarity: Rarity }[] = [
  { x: 55, z: -50, id: "bulwark", rarity: "superior" },
  { x: -55, z: -48, id: "hornet", rarity: "apex" },
  { x: 58, z: 52, id: "vanguard", rarity: "superior" },
  { x: -18, z: 74, id: "longwatch", rarity: "apex" },
  { x: 10, z: 10, id: "triad", rarity: "refined" },
];

export const RARITY_COLOR: Record<Rarity, number> = {
  standard: 0xb0b8c1,
  refined: 0x34d399,
  superior: 0x38bdf8,
  apex: 0xf59e0b,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  standard: "Standard",
  refined: "Refined",
  superior: "Superior",
  apex: "Apex",
};

export const RARITY_MULT: Record<Rarity, { dmg: number; mag: number }> = {
  standard: { dmg: 1, mag: 1 },
  refined: { dmg: 1.08, mag: 1.1 },
  superior: { dmg: 1.16, mag: 1.18 },
  apex: { dmg: 1.28, mag: 1.28 },
};

export const ARMOR_STATS = [
  { level: 0, hp: 0, absorb: 0 },
  { level: 1, hp: 50, absorb: 0.55 },
  { level: 2, hp: 75, absorb: 0.68 },
  { level: 3, hp: 100, absorb: 0.8 },
];

export const WEAPONS: Record<string, WeaponDef> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    class: "ar",
    damage: 21,
    fireRate: 9.2,
    magazine: 30,
    reload: 2.05,
    range: 92,
    spread: 0.018,
    adsSpread: 0.006,
    moveSpread: 0.034,
    recoil: 0.32,
    accuracy: 0.86,
    ammoType: "heavy",
    headshot: 1.55,
    pellets: 1,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.78,
    trigger: "auto",
    color: 0x6b7280,
    barrelLength: 1.15,
    thickness: 0.07,
  },
  hornet: {
    id: "hornet",
    name: "Hornet",
    class: "smg",
    damage: 14,
    fireRate: 14.5,
    magazine: 28,
    reload: 1.55,
    range: 42,
    spread: 0.034,
    adsSpread: 0.016,
    moveSpread: 0.022,
    recoil: 0.22,
    accuracy: 0.74,
    ammoType: "light",
    headshot: 1.4,
    pellets: 1,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.9,
    trigger: "auto",
    color: 0x64748b,
    barrelLength: 0.72,
    thickness: 0.065,
  },
  braker: {
    id: "braker",
    name: "Braker-12",
    class: "shotgun",
    damage: 14,
    fireRate: 1.15,
    magazine: 6,
    reload: 2.6,
    range: 22,
    spread: 0.09,
    adsSpread: 0.055,
    moveSpread: 0.11,
    recoil: 0.85,
    accuracy: 0.55,
    ammoType: "shells",
    headshot: 1.25,
    pellets: 8,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.8,
    trigger: "semi",
    color: 0x57534e,
    barrelLength: 0.82,
    thickness: 0.1,
  },
  longwatch: {
    id: "longwatch",
    name: "Longwatch",
    class: "sniper",
    damage: 86,
    fireRate: 0.72,
    magazine: 5,
    reload: 2.9,
    range: 180,
    spread: 0.012,
    adsSpread: 0.0012,
    moveSpread: 0.05,
    recoil: 1.15,
    accuracy: 0.96,
    ammoType: "precision",
    headshot: 2.15,
    pellets: 1,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.55,
    trigger: "semi",
    color: 0x44403c,
    barrelLength: 1.7,
    thickness: 0.06,
  },
  triad: {
    id: "triad",
    name: "Triad",
    class: "burst",
    damage: 24,
    fireRate: 3.4,
    magazine: 24,
    reload: 2.15,
    range: 95,
    spread: 0.016,
    adsSpread: 0.005,
    moveSpread: 0.03,
    recoil: 0.28,
    accuracy: 0.9,
    ammoType: "heavy",
    headshot: 1.6,
    pellets: 1,
    burstCount: 3,
    burstGap: 0.055,
    adsSlow: 0.76,
    trigger: "burst",
    color: 0x52525b,
    barrelLength: 1.2,
    thickness: 0.07,
  },
  keeper: {
    id: "keeper",
    name: "Keeper",
    class: "pistol",
    damage: 22,
    fireRate: 5.4,
    magazine: 12,
    reload: 1.35,
    range: 38,
    spread: 0.022,
    adsSpread: 0.01,
    moveSpread: 0.028,
    recoil: 0.24,
    accuracy: 0.8,
    ammoType: "light",
    headshot: 1.7,
    pellets: 1,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.92,
    trigger: "semi",
    color: 0x71717a,
    barrelLength: 0.42,
    thickness: 0.055,
  },
  bulwark: {
    id: "bulwark",
    name: "Bulwark",
    class: "lmg",
    damage: 19,
    fireRate: 8.1,
    magazine: 60,
    reload: 3.4,
    range: 85,
    spread: 0.028,
    adsSpread: 0.012,
    moveSpread: 0.05,
    recoil: 0.4,
    accuracy: 0.78,
    ammoType: "heavy",
    headshot: 1.45,
    pellets: 1,
    burstCount: 1,
    burstGap: 0,
    adsSlow: 0.62,
    trigger: "auto",
    color: 0x3f3f46,
    barrelLength: 1.28,
    thickness: 0.09,
  },
};

export const WEAPON_SPAWN_WEIGHT: Record<string, number> = {
  vanguard: 1.1,
  hornet: 1.15,
  braker: 0.85,
  longwatch: 0.45,
  triad: 0.8,
  keeper: 0.55,
  bulwark: 0.5,
};

export const RARITY_WEIGHT: { rarity: Rarity; w: number }[] = [
  { rarity: "standard", w: 52 },
  { rarity: "refined", w: 30 },
  { rarity: "superior", w: 14 },
  { rarity: "apex", w: 4 },
];

export interface PersonalityDef {
  id: Personality;
  aim: number;
  aggression: number;
  reaction: number;
  preferredRange: number;
  lootBias: number;
  vision: number;
  fov: number;
  color: number;
  accent: number;
}

export const PERSONALITIES: Record<Personality, PersonalityDef> = {
  aggressive: {
    id: "aggressive",
    aim: 0.78,
    aggression: 0.92,
    reaction: 0.18,
    preferredRange: 22,
    lootBias: 0.25,
    vision: 58,
    fov: 1.7,
    color: 0x7c2d12,
    accent: 0xef4444,
  },
  defensive: {
    id: "defensive",
    aim: 0.86,
    aggression: 0.38,
    reaction: 0.28,
    preferredRange: 38,
    lootBias: 0.4,
    vision: 52,
    fov: 1.45,
    color: 0x1e3a5f,
    accent: 0x60a5fa,
  },
  balanced: {
    id: "balanced",
    aim: 0.8,
    aggression: 0.62,
    reaction: 0.22,
    preferredRange: 28,
    lootBias: 0.45,
    vision: 54,
    fov: 1.55,
    color: 0x3f4f2a,
    accent: 0xa3e635,
  },
  looter: {
    id: "looter",
    aim: 0.7,
    aggression: 0.32,
    reaction: 0.34,
    preferredRange: 24,
    lootBias: 0.92,
    vision: 46,
    fov: 1.35,
    color: 0x6b5424,
    accent: 0xfbbf24,
  },
};

export interface ZonePhase {
  wait: number;
  shrink: number;
  radius: number;
  dps: number;
  label: string;
}

export const ZONE_PHASES: ZonePhase[] = [
  { wait: 28, shrink: 0, radius: 118, dps: 1, label: "Preparation" },
  { wait: 18, shrink: 22, radius: 78, dps: 2.5, label: "First Collapse" },
  { wait: 14, shrink: 18, radius: 48, dps: 5, label: "Second Collapse" },
  { wait: 12, shrink: 16, radius: 26, dps: 9, label: "Third Collapse" },
  { wait: 10, shrink: 14, radius: 12, dps: 14, label: "Final Circle" },
  { wait: 8, shrink: 12, radius: 4.5, dps: 22, label: "Last Stand" },
];

export const CALLSIGNS = [
  "Ash", "Rook", "Nyx", "Hex", "Vex", "Ion", "Kite", "Wren",
  "Bolt", "Dusk", "Flint", "Gale", "Haze", "Jinx", "Knox", "Lark",
  "Moth", "Onyx", "Pike", "Quill", "Rift", "Silk", "Tarn", "Umbra",
  "Vela", "Wisp", "Yarrow", "Zephyr", "Crag", "Drift",
];

export const TIPS = [
  "High ground on Overlook owns The Flats — bring a Longwatch.",
  "Old Town interiors favor the Hornet and Braker-12.",
  "The storm does not wait. Rotate early.",
  "Armor absorbs a percentage of damage until it breaks.",
  "Headshots multiply damage. Aim high.",
  "Ammo is typed. Don't dump a Vanguard without Heavy rounds.",
  "Sprint drains stamina. Crouch to recover faster and shrink your profile.",
  "Right-mouse tightens your cone of fire.",
  "Listen for gunfire — third parties win matches.",
  "Apex loot glows gold. It is worth the detour.",
];

export function pickWeighted<T>(items: { item: T; w: number }[], rng: () => number): T {
  let sum = 0;
  for (const it of items) sum += it.w;
  let r = rng() * sum;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.item;
  }
  return items[items.length - 1].item;
}

export function magFor(def: WeaponDef, rarity: Rarity): number {
  return Math.max(1, Math.round(def.magazine * RARITY_MULT[rarity].mag));
}

export function dmgFor(def: WeaponDef, rarity: Rarity): number {
  return def.damage * RARITY_MULT[rarity].dmg;
}
