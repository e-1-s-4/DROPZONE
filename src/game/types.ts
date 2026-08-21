export type GameState =
  | "menu"
  | "loading"
  | "drop"
  | "playing"
  | "paused"
  | "dead"
  | "victory";

export type AmmoType = "light" | "heavy" | "shells" | "precision";

export type WeaponClass =
  | "ar"
  | "smg"
  | "shotgun"
  | "sniper"
  | "burst"
  | "pistol"
  | "lmg";

export type Rarity = "standard" | "refined" | "superior" | "apex";

export type Personality = "aggressive" | "defensive" | "balanced" | "looter";

export type AIState =
  | "idle"
  | "wander"
  | "loot"
  | "travel"
  | "investigate"
  | "cover"
  | "attack"
  | "retreat"
  | "heal"
  | "search";

export type LootKind = "weapon" | "ammo" | "armor" | "heal" | "armorKit" | "boost";

export interface WeaponDef {
  id: string;
  name: string;
  class: WeaponClass;
  damage: number;
  fireRate: number;
  magazine: number;
  reload: number;
  range: number;
  spread: number;
  adsSpread: number;
  moveSpread: number;
  recoil: number;
  accuracy: number;
  ammoType: AmmoType;
  headshot: number;
  pellets: number;
  burstCount: number;
  burstGap: number;
  adsSlow: number;
  color: number;
  barrelLength: number;
  thickness: number;
}

export interface WeaponInstance {
  defId: string;
  ammo: number;
  rarity: Rarity;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface Notification {
  id: number;
  text: string;
  color: string;
  t: number;
}

export interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  t: number;
}

export interface HearEvent {
  x: number;
  z: number;
  t: number;
  radius: number;
  sourceId: number;
}

export interface HudSnapshot {
  state: GameState;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  armorLevel: number;
  stamina: number;
  weaponName: string;
  weaponClass: string;
  rarity: Rarity | null;
  ammo: number;
  mag: number;
  reserve: number;
  ammoType: AmmoType | null;
  reloading: boolean;
  reloadT: number;
  aliveCount: number;
  totalPlayers: number;
  kills: number;
  matchTime: number;
  zonePhase: number;
  zoneLabel: string;
  zoneCountdown: number;
  shrinking: boolean;
  inZone: boolean;
  zoneDist: number;
  zoneDmg: number;
  prompt: string | null;
  notifications: Notification[];
  killFeed: KillFeedItem[];
  playerX: number;
  playerZ: number;
  playerYaw: number;
  zoneCx: number;
  zoneCz: number;
  zoneR: number;
  nextCx: number;
  nextCz: number;
  nextR: number;
  enemies: { x: number; z: number; alive: boolean; yaw: number }[];
  loot: { x: number; z: number; color: number }[];
  spread: number;
  ads: boolean;
  crouched: boolean;
  sprinting: boolean;
  hurtFlash: number;
  hitMarker: number;
  headMarker: boolean;
  fps: number;
  debug: boolean;
  debugLines: string[];
  heals: number;
  kits: number;
  boosts: number;
  ammoCounts: Record<AmmoType, number>;
  slots: (WeaponInstance | null)[];
  activeSlot: number;
  placement: number;
  survivalTime: number;
  usingItem: string | null;
  useProgress: number;
}

export interface SettingsData {
  sensitivity: number;
  master: number;
  sfx: number;
  music: number;
  quality: "low" | "medium" | "high";
  showFps: boolean;
  fov: number;
}

export const DEFAULT_SETTINGS: SettingsData = {
  sensitivity: 1,
  master: 0.8,
  sfx: 0.85,
  music: 0.45,
  quality: "medium",
  showFps: false,
  fov: 70,
};
