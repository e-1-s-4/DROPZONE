import * as THREE from "three";
import type { AIState, Personality, WeaponInstance } from "./types";
import {
  ARMOR_STATS,
  CALLSIGNS,
  MAX_HEALTH,
  PERSONALITIES,
  PLAYER_RADIUS,
  WEAPONS,
  dmgFor,
  magFor,
} from "./config";
import { angleDiff, clampToMap, dist2, losBlocked, resolveCircle } from "./Collision";
import { createSoldier, createWeaponMesh, animateSoldier, type SoldierRig } from "./Models";
import type { AABB } from "./types";
import type { NavGrid } from "./NavGrid";
import type { LootItem, LootSystem } from "./LootSystem";
import type { ZoneManager } from "./ZoneManager";
import type { CoverPoint } from "./World";

export interface Combatant {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  armor: number;
  armorLevel: number;
  alive: boolean;
  isPlayer: boolean;
  height: number;
}

export class Enemy {
  id: number;
  name: string;
  personality: Personality;
  x: number;
  y = 0;
  z: number;
  yaw = 0;
  pitch = 0.1;
  vx = 0;
  vz = 0;
  health = MAX_HEALTH;
  armor = 50;
  armorLevel = 1;
  alive = true;
  state: AIState = "wander";
  weapon: WeaponInstance;
  reserve = 80;
  heals = 1;
  reloading = false;
  reloadT = 0;
  fireCd = 0;
  thinkT = 0;
  path: { x: number; z: number }[] = [];
  pathI = 0;
  targetId: number | null = null;
  lastSeenX = 0;
  lastSeenZ = 0;
  lastSeenT = -999;
  investigate: { x: number; z: number } | null = null;
  cover: { x: number; z: number } | null = null;
  lootTarget: LootItem | null = null;
  shootPulse = 0;
  footT = 0;
  speed = 0;
  invuln = 0.8;
  strafeDir = 1;
  strafeT = 0;
  stateT = 0;
  kills = 0;
  mesh: THREE.Group;
  rig: SoldierRig;
  weaponMesh: THREE.Object3D | null = null;
  height = 1.7;
  isPlayer = false;
  burstLeft = 0;

  constructor(id: number, name: string, personality: Personality, x: number, z: number, weapon: WeaponInstance) {
    this.id = id;
    this.name = name;
    this.personality = personality;
    this.x = x;
    this.z = z;
    this.weapon = weapon;
    const p = PERSONALITIES[personality];
    this.rig = createSoldier({ body: p.color, accent: p.accent, visor: p.accent });
    this.mesh = this.rig.group;
    this.equipVisual();
    if (personality === "looter") this.armorLevel = 0, this.armor = 0;
    else if (personality === "defensive") this.armorLevel = 2, this.armor = 75;
  }

  private equipVisual() {
    if (this.weaponMesh) this.rig.weaponMount.remove(this.weaponMesh);
    const col =
      this.weapon.rarity === "apex"
        ? 0xf59e0b
        : this.weapon.rarity === "superior"
          ? 0x38bdf8
          : this.weapon.rarity === "refined"
            ? 0x34d399
            : 0x9ca3af;
    this.weaponMesh = createWeaponMesh(this.weapon.defId, col);
    this.rig.weaponMount.add(this.weaponMesh);
  }

  get def() {
    return WEAPONS[this.weapon.defId];
  }

  asCombatant(): Combatant {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      z: this.z,
      yaw: this.yaw,
      health: this.health,
      armor: this.armor,
      armorLevel: this.armorLevel,
      alive: this.alive,
      isPlayer: false,
      height: this.height,
    };
  }

  update(dt: number, ctx: AIContext) {
    if (!this.alive) {
      this.mesh.rotation.x = Math.min(this.mesh.rotation.x + dt * 2.5, Math.PI / 2);
      this.mesh.position.y = Math.max(0, this.mesh.position.y - dt * 0.4);
      return;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shootPulse > 0) this.shootPulse = Math.max(0, this.shootPulse - dt * 8);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.stateT += dt;
    this.strafeT -= dt;

    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        const mag = magFor(this.def, this.weapon.rarity);
        const need = mag - this.weapon.ammo;
        const take = Math.min(need, this.reserve);
        this.weapon.ammo += take;
        this.reserve -= take;
      }
    }

    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.12 + Math.random() * 0.16;
      this.brain(ctx);
    }

    this.move(dt, ctx);
    this.tryShoot(ctx);

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw + Math.PI;
    animateSoldier(this.rig, this.speed, this.footT, false, this.pitch, this.shootPulse);
  }

  private brain(ctx: AIContext) {
    const p = PERSONALITIES[this.personality];
    const outside = ctx.zone.outside(this.x, this.z);
    const distZone = ctx.zone.distToSafe(this.x, this.z);

    if (outside || (ctx.zone.shrinking && distZone > -8)) {
      this.state = "travel";
      const dest = ctx.zone.randomInside(() => Math.random(), 0.55);
      this.setPath(ctx, dest.x, dest.z);
      return;
    }

    if (this.health < 35 && this.heals > 0 && this.state !== "attack") {
      this.state = "heal";
      this.heals--;
      this.health = Math.min(MAX_HEALTH, this.health + 45);
      this.state = "cover";
      this.pickCover(ctx);
      return;
    }

    const vis = this.findVisible(ctx, p.vision, p.fov);
    if (vis) {
      this.targetId = vis.id;
      this.lastSeenX = vis.x;
      this.lastSeenZ = vis.z;
      this.lastSeenT = ctx.time;
      const d = Math.hypot(vis.x - this.x, vis.z - this.z);
      if (this.health < 28 && p.aggression < 0.5) {
        this.state = "retreat";
        const away = Math.atan2(this.x - vis.x, this.z - vis.z);
        this.setPath(ctx, this.x + Math.sin(away) * 18, this.z + Math.cos(away) * 18);
      } else if (d < p.preferredRange * 0.45 && this.personality === "defensive") {
        this.state = "cover";
        this.pickCover(ctx);
      } else {
        this.state = "attack";
      }
      return;
    }

    if (ctx.time - this.lastSeenT < 3.5 && this.targetId != null) {
      this.state = "search";
      this.setPath(ctx, this.lastSeenX, this.lastSeenZ);
      return;
    }

    const hear = ctx.hears.find(
      (h) => h.sourceId !== this.id && dist2(this.x, this.z, h.x, h.z) < h.radius * h.radius,
    );
    if (hear && p.aggression > 0.3) {
      this.state = "investigate";
      this.investigate = { x: hear.x, z: hear.z };
      this.setPath(ctx, hear.x, hear.z);
      return;
    }

    if (p.lootBias > 0.3) {
      const loot = this.bestLoot(ctx);
      if (loot) {
        this.state = "loot";
        this.lootTarget = loot;
        this.setPath(ctx, loot.x, loot.z);
        return;
      }
    }

    if (this.state !== "wander" || this.path.length === 0 || this.pathI >= this.path.length) {
      this.state = "wander";
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 18;
      this.setPath(ctx, this.x + Math.sin(a) * r, this.z + Math.cos(a) * r);
    }
  }

  private findVisible(ctx: AIContext, vision: number, fov: number): Combatant | null {
    let best: Combatant | null = null;
    let bestD = vision * vision;
    for (const c of ctx.combatants) {
      if (!c.alive || c.id === this.id) continue;
      const d2 = dist2(this.x, this.z, c.x, c.z);
      if (d2 > bestD) continue;
      const ang = Math.atan2(c.x - this.x, c.z - this.z);
      if (Math.abs(angleDiff(this.yaw, ang)) > fov) continue;
      if (losBlocked(this.x, this.z, c.x, c.z, ctx.colliders, 1.4)) continue;
      bestD = d2;
      best = c;
    }
    return best;
  }

  private bestLoot(ctx: AIContext): LootItem | null {
    let best: LootItem | null = null;
    let bestScore = 0;
    for (const it of ctx.loot.items) {
      if (it.taken) continue;
      const d = Math.hypot(it.x - this.x, it.z - this.z);
      if (d > 28) continue;
      let score = 0;
      if (it.kind === "weapon" && it.weapon) {
        const cur = this.dps();
        const nxt = dpsOf(it.weapon);
        if (nxt > cur * 1.12) score = (nxt - cur) * 4 + (30 - d);
      } else if (it.kind === "armor" && (it.armorLevel ?? 0) > this.armorLevel) score = 40 - d;
      else if (it.kind === "heal" && this.health < 70) score = 25 - d;
      else if (it.kind === "ammo" && this.reserve < 30) score = 15 - d;
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  private dps() {
    return dpsOf(this.weapon);
  }

  private pickCover(ctx: AIContext) {
    let best: CoverPoint | null = null;
    let bestD = 40;
    for (const c of ctx.cover) {
      const d = Math.hypot(c.x - this.x, c.z - this.z);
      if (d < 2 || d > bestD) continue;
      bestD = d;
      best = c;
    }
    if (best) {
      this.cover = best;
      this.setPath(ctx, best.x, best.z);
    }
  }

  private setPath(ctx: AIContext, x: number, z: number) {
    const cl = clampToMap(x, z, 4, 96);
    const start = ctx.nav.nearestWalkable(this.x, this.z);
    const goal = ctx.nav.nearestWalkable(cl.x, cl.z);
    this.path = ctx.nav.path(start.x, start.z, goal.x, goal.z);
    this.pathI = 0;
  }

  private move(dt: number, ctx: AIContext) {
    const p = PERSONALITIES[this.personality];
    let tx = this.x;
    let tz = this.z;
    let want = 0;

    if (this.state === "attack" && this.targetId != null) {
      const t = ctx.combatants.find((c) => c.id === this.targetId && c.alive);
      if (t) {
        const d = Math.hypot(t.x - this.x, t.z - this.z);
        const desired = p.preferredRange;
        const ang = Math.atan2(t.x - this.x, t.z - this.z);
        this.yaw += angleDiff(this.yaw, ang) * Math.min(1, dt * 8);
        if (this.strafeT <= 0) {
          this.strafeDir = Math.random() < 0.5 ? -1 : 1;
          this.strafeT = 0.6 + Math.random() * 0.8;
        }
        const side = this.yaw + Math.PI / 2;
        if (d > desired + 4) {
          tx = t.x;
          tz = t.z;
          want = 7.2;
        } else if (d < desired * 0.55) {
          tx = this.x - Math.sin(ang) * 6;
          tz = this.z - Math.cos(ang) * 6;
          want = 6.4;
        } else {
          tx = this.x + Math.sin(side) * this.strafeDir * 5;
          tz = this.z + Math.cos(side) * this.strafeDir * 5;
          want = 5.2;
        }
      }
    } else if (this.path.length && this.pathI < this.path.length) {
      const wp = this.path[this.pathI];
      const d = Math.hypot(wp.x - this.x, wp.z - this.z);
      if (d < 1.3) this.pathI++;
      else {
        tx = wp.x;
        tz = wp.z;
        want = this.state === "travel" ? 9.2 : this.state === "retreat" ? 10.2 : 6.6;
      }
    }

    if (this.state === "loot" && this.lootTarget && !this.lootTarget.taken) {
      if (dist2(this.x, this.z, this.lootTarget.x, this.lootTarget.z) < 2.2 * 2.2) {
        this.consumeLoot(this.lootTarget, ctx);
      }
    }

    const dx = tx - this.x;
    const dz = tz - this.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.05 && want > 0) {
      const ang = Math.atan2(dx, dz);
      if (this.state !== "attack") this.yaw += angleDiff(this.yaw, ang) * Math.min(1, dt * 6);
      this.vx = (dx / len) * want;
      this.vz = (dz / len) * want;
    } else {
      this.vx *= 1 - Math.min(1, dt * 10);
      this.vz *= 1 - Math.min(1, dt * 10);
    }
    this.speed = Math.hypot(this.vx, this.vz);
    this.footT += this.speed * dt;

    const gy = ctx.groundY(this.x, this.z);
    this.y = gy;
    const nx = this.x + this.vx * dt;
    const rx = resolveCircle(nx, this.z, PLAYER_RADIUS, ctx.colliders, this.y + 0.9);
    this.x = rx.x;
    const nz = this.z + this.vz * dt;
    const rz = resolveCircle(this.x, nz, PLAYER_RADIUS, ctx.colliders, this.y + 0.9);
    this.z = rz.z;
    const cl = clampToMap(this.x, this.z, 3, 98);
    this.x = cl.x;
    this.z = cl.z;
  }

  private consumeLoot(it: LootItem, ctx: AIContext) {
    ctx.loot.take(it);
    if (it.kind === "weapon" && it.weapon) {
      if (dpsOf(it.weapon) > this.dps()) {
        ctx.loot.dropWeapon(this.x, this.z, this.weapon);
        this.weapon = it.weapon;
        this.equipVisual();
      }
    } else if (it.kind === "ammo") {
      this.reserve += it.ammoCount ?? 20;
    } else if (it.kind === "armor" && (it.armorLevel ?? 0) >= this.armorLevel) {
      this.armorLevel = it.armorLevel ?? 1;
      this.armor = ARMOR_STATS[this.armorLevel].hp;
    } else if (it.kind === "heal") this.heals++;
    this.lootTarget = null;
    this.state = "wander";
  }

  private tryShoot(ctx: AIContext) {
    if (this.state !== "attack" || this.reloading || this.fireCd > 0) return;
    const t = ctx.combatants.find((c) => c.id === this.targetId && c.alive);
    if (!t) return;
    if (losBlocked(this.x, this.z, t.x, t.z, ctx.colliders, 1.4)) return;
    const def = this.def;
    if (this.weapon.ammo <= 0) {
      if (this.reserve > 0) {
        this.reloading = true;
        this.reloadT = def.reload;
      }
      return;
    }
    const d = Math.hypot(t.x - this.x, t.z - this.z);
    if (d > def.range * 0.95) return;
    const p = PERSONALITIES[this.personality];
    const aim = p.aim * def.accuracy * (1 - Math.min(0.5, d / def.range) * 0.4);
    this.weapon.ammo--;
    this.fireCd = 1 / def.fireRate + (Math.random() * 0.08);
    this.shootPulse = 1;
    ctx.onShot(this, t, aim, d);
  }

  takeDamage(raw: number, _head: boolean) {
    if (!this.alive || this.invuln > 0) return 0;
    let dmg = raw;
    const absorb = ARMOR_STATS[this.armorLevel]?.absorb ?? 0;
    if (this.armor > 0 && absorb > 0) {
      const blocked = dmg * absorb;
      const fromArmor = Math.min(this.armor, blocked);
      this.armor -= fromArmor;
      dmg -= fromArmor;
    }
    this.health -= dmg;
    this.lastSeenT = 0;
    this.state = "attack";
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return dmg;
  }
}

function dpsOf(w: WeaponInstance) {
  const def = WEAPONS[w.defId];
  return dmgFor(def, w.rarity) * def.fireRate * def.pellets;
}

export interface AIContext {
  time: number;
  colliders: AABB[];
  nav: NavGrid;
  loot: LootSystem;
  zone: ZoneManager;
  cover: CoverPoint[];
  combatants: Combatant[];
  hears: { x: number; z: number; radius: number; sourceId: number }[];
  groundY: (x: number, z: number) => number;
  onShot: (self: Enemy, target: Combatant, aim: number, dist: number) => void;
}

export function spawnEnemies(
  spawns: { x: number; z: number }[],
  playerX: number,
  playerZ: number,
  count: number,
  rng: () => number,
): Enemy[] {
  const personalities: Personality[] = ["aggressive", "defensive", "balanced", "looter"];
  const weapons = ["vanguard", "hornet", "braker", "keeper", "triad", "longwatch", "bulwark"];
  const used = new Set<number>();
  const out: Enemy[] = [];
  const names = CALLSIGNS.slice().sort(() => rng() - 0.5);
  let n = 0;
  const sorted = spawns
    .map((s, i) => ({ s, i, d: dist2(s.x, s.z, playerX, playerZ) }))
    .sort((a, b) => b.d - a.d);
  for (const sp of sorted) {
    if (out.length >= count) break;
    if (sp.d < 28 * 28) continue;
    if (used.has(sp.i)) continue;
    used.add(sp.i);
    const pers = personalities[n % personalities.length];
    const wId = weapons[(n * 3 + (rng() * 3) | 0) % weapons.length];
    const rarity = rng() < 0.15 ? "refined" : "standard";
    const inst: WeaponInstance = {
      defId: wId,
      ammo: magFor(WEAPONS[wId], rarity as "standard"),
      rarity: rarity as "standard" | "refined",
    };
    const e = new Enemy(n + 2, names[n % names.length], pers, sp.s.x, sp.s.z, inst);
    e.yaw = rng() * Math.PI * 2;
    out.push(e);
    n++;
  }
  return out;
}
