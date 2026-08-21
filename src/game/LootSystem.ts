import * as THREE from "three";
import type { AmmoType, LootKind, Rarity, WeaponInstance } from "./types";
import {
  RARITY_COLOR,
  RARITY_WEIGHT,
  WEAPON_SPAWN_WEIGHT,
  WEAPONS,
  magFor,
  pickWeighted,
} from "./config";
import { createLootBeacon } from "./Models";
import type { LootSpot } from "./World";

export interface LootItem {
  id: number;
  kind: LootKind;
  x: number;
  z: number;
  y: number;
  weapon?: WeaponInstance;
  ammoType?: AmmoType;
  ammoCount?: number;
  armorLevel?: number;
  rarity: Rarity;
  taken: boolean;
  mesh: THREE.Object3D;
}

let nextId = 1;

export class LootSystem {
  items: LootItem[] = [];
  group = new THREE.Group();

  spawnAll(spots: LootSpot[], rng: () => number) {
    this.clear();
    const used = new Set<string>();
    const n = Math.min(spots.length, 96);
    const shuffled = spots.slice().sort(() => rng() - 0.5);
    for (let i = 0; i < n; i++) {
      const s = shuffled[i];
      const key = `${s.x | 0}_${s.z | 0}`;
      if (used.has(key)) continue;
      used.add(key);
      const roll = rng();
      if (roll < 0.38) this.spawnWeapon(s.x, s.z, rng);
      else if (roll < 0.62) this.spawnAmmo(s.x, s.z, rng);
      else if (roll < 0.78) this.spawnArmor(s.x, s.z, rng);
      else if (roll < 0.93) this.spawnHeal(s.x, s.z, rng);
      else this.spawnBoost(s.x, s.z);
    }
  }

  spawnWeapon(x: number, z: number, rng: () => number, forceId?: string, rarity?: Rarity) {
    const id =
      forceId ??
      pickWeighted(
        Object.keys(WEAPON_SPAWN_WEIGHT).map((k) => ({ item: k, w: WEAPON_SPAWN_WEIGHT[k] })),
        rng,
      );
    const r =
      rarity ??
      pickWeighted(
        RARITY_WEIGHT.map((v) => ({ item: v.rarity, w: v.w })),
        rng,
      );
    const def = WEAPONS[id];
    const inst: WeaponInstance = { defId: id, ammo: magFor(def, r), rarity: r };
    const mesh = createLootBeacon(RARITY_COLOR[r]);
    mesh.position.set(x, 0, z);
    this.group.add(mesh);
    this.items.push({
      id: nextId++,
      kind: "weapon",
      x,
      z,
      y: 0,
      weapon: inst,
      rarity: r,
      taken: false,
      mesh,
    });
  }

  spawnAmmo(x: number, z: number, rng: () => number) {
    const types: AmmoType[] = ["light", "heavy", "shells", "precision"];
    const ammoType = types[(rng() * types.length) | 0];
    const counts: Record<AmmoType, number> = { light: 30, heavy: 24, shells: 8, precision: 6 };
    const mesh = createLootBeacon(0xd6d3d1);
    mesh.position.set(x, 0, z);
    mesh.scale.setScalar(0.7);
    this.group.add(mesh);
    this.items.push({
      id: nextId++,
      kind: "ammo",
      x,
      z,
      y: 0,
      ammoType,
      ammoCount: counts[ammoType],
      rarity: "standard",
      taken: false,
      mesh,
    });
  }

  spawnArmor(x: number, z: number, rng: () => number) {
    const level = rng() < 0.55 ? 1 : rng() < 0.7 ? 2 : 3;
    const colors = [0x9ca3af, 0x60a5fa, 0xc4b5fd];
    const mesh = createLootBeacon(colors[level - 1]);
    mesh.position.set(x, 0, z);
    this.group.add(mesh);
    this.items.push({
      id: nextId++,
      kind: "armor",
      x,
      z,
      y: 0,
      armorLevel: level,
      rarity: level === 3 ? "apex" : level === 2 ? "superior" : "refined",
      taken: false,
      mesh,
    });
  }

  spawnHeal(x: number, z: number, rng: () => number) {
    const kit = rng() < 0.35;
    const mesh = createLootBeacon(kit ? 0x38bdf8 : 0x4ade80);
    mesh.position.set(x, 0, z);
    mesh.scale.setScalar(0.75);
    this.group.add(mesh);
    this.items.push({
      id: nextId++,
      kind: kit ? "armorKit" : "heal",
      x,
      z,
      y: 0,
      rarity: kit ? "superior" : "refined",
      taken: false,
      mesh,
    });
  }

  spawnBoost(x: number, z: number) {
    const mesh = createLootBeacon(0xf472b6);
    mesh.position.set(x, 0, z);
    mesh.scale.setScalar(0.7);
    this.group.add(mesh);
    this.items.push({
      id: nextId++,
      kind: "boost",
      x,
      z,
      y: 0,
      rarity: "superior",
      taken: false,
      mesh,
    });
  }

  dropWeapon(x: number, z: number, inst: WeaponInstance) {
    this.spawnWeapon(x + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 1.2, Math.random, inst.defId, inst.rarity);
    const last = this.items[this.items.length - 1];
    if (last.weapon) last.weapon.ammo = inst.ammo;
  }

  nearest(x: number, z: number, range: number): LootItem | null {
    let best: LootItem | null = null;
    let bestD = range * range;
    for (const it of this.items) {
      if (it.taken) continue;
      const d = (it.x - x) ** 2 + (it.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  take(it: LootItem) {
    it.taken = true;
    it.mesh.visible = false;
  }

  update(t: number) {
    for (const it of this.items) {
      if (it.taken) continue;
      it.mesh.position.y = 0.15 + Math.sin(t * 2.4 + it.id) * 0.12;
      it.mesh.rotation.y = t * 1.2 + it.id;
    }
  }

  label(it: LootItem) {
    if (it.kind === "weapon" && it.weapon) {
      const def = WEAPONS[it.weapon.defId];
      return `${it.weapon.rarity.toUpperCase()} ${def.name}`;
    }
    if (it.kind === "ammo") return `${it.ammoCount} ${it.ammoType} ammo`;
    if (it.kind === "armor") return `Mk.${it.armorLevel} Armor`;
    if (it.kind === "heal") return "Field Stim";
    if (it.kind === "armorKit") return "Plate Kit";
    if (it.kind === "boost") return "Adrenal Surge";
    return "Loot";
  }

  clear() {
    this.items = [];
    while (this.group.children.length) this.group.remove(this.group.children[0]);
  }
}
