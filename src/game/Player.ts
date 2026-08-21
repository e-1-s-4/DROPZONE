import * as THREE from "three";
import {
  ADS_SPEED_MULT,
  ARMOR_STATS,
  CROUCH_HEIGHT,
  CROUCH_SPEED,
  GRAVITY,
  JUMP_SPEED,
  MAX_HEALTH,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  SPRINT_SPEED,
  STAMINA_MAX,
  WALK_SPEED,
  WEAPONS,
  magFor,
} from "./config";
import { clamp, clampToMap, resolveCircle } from "./Collision";
import { createSoldier, createWeaponMesh, animateSoldier, type SoldierRig } from "./Models";
import type { AmmoType, AABB, WeaponInstance } from "./types";
import type { InputManager } from "./InputManager";

export class Player {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vz = 0;
  vy = 0;
  yaw = 0;
  pitch = 0.18;
  health = MAX_HEALTH;
  armor = 0;
  armorLevel = 0;
  stamina = STAMINA_MAX;
  crouched = false;
  sprinting = false;
  ads = false;
  grounded = true;
  alive = true;
  kills = 0;
  slots: (WeaponInstance | null)[] = [
    { defId: "keeper", ammo: 12, rarity: "standard" },
    null,
  ];
  activeSlot = 0;
  reserve: Record<AmmoType, number> = { light: 48, heavy: 0, shells: 0, precision: 0 };
  heals = 1;
  kits = 0;
  boosts = 0;
  reloading = false;
  reloadT = 0;
  fireCd = 0;
  burstLeft = 0;
  burstCd = 0;
  recoil = 0;
  spread = 0.02;
  using: "heal" | "kit" | "boost" | null = null;
  useT = 0;
  useMax = 1;
  shootPulse = 0;
  invuln = 1.2;
  footT = 0;
  speed = 0;
  boostT = 0;
  mesh: THREE.Group;
  rig: SoldierRig;
  weaponMesh: THREE.Object3D | null = null;
  height = PLAYER_HEIGHT;

  constructor() {
    this.rig = createSoldier({
      body: 0x134e4a,
      accent: 0x2dd4bf,
      visor: 0x5eead4,
      isPlayer: true,
    });
    this.mesh = this.rig.group;
    this.rebuildWeapon();
  }

  get weapon(): WeaponInstance | null {
    return this.slots[this.activeSlot];
  }

  get def() {
    const w = this.weapon;
    return w ? WEAPONS[w.defId] : WEAPONS.keeper;
  }

  spawn(x: number, z: number, yaw: number) {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.yaw = yaw;
    this.alive = true;
    this.health = MAX_HEALTH;
    this.armor = 0;
    this.armorLevel = 0;
    this.stamina = STAMINA_MAX;
    this.invuln = 1.4;
  }

  rebuildWeapon() {
    if (this.weaponMesh) {
      this.rig.weaponMount.remove(this.weaponMesh);
      this.weaponMesh = null;
    }
    const w = this.weapon;
    if (!w) return;
    const rarityColor =
      w.rarity === "apex" ? 0xf59e0b : w.rarity === "superior" ? 0x38bdf8 : w.rarity === "refined" ? 0x34d399 : 0x9ca3af;
    this.weaponMesh = createWeaponMesh(w.defId, rarityColor);
    this.rig.weaponMount.add(this.weaponMesh);
  }

  maxArmor() {
    return ARMOR_STATS[this.armorLevel]?.hp ?? 0;
  }

  update(
    dt: number,
    input: InputManager,
    colliders: AABB[],
    groundY: (x: number, z: number) => number,
    sensitivity: number,
    canControl: boolean,
  ) {
    if (!this.alive) return;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.boostT > 0) this.boostT -= dt;
    if (this.shootPulse > 0) this.shootPulse = Math.max(0, this.shootPulse - dt * 8);
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);

    if (canControl) {
      this.yaw -= input.dx * 0.0022 * sensitivity;
      this.pitch += input.dy * 0.0018 * sensitivity;
      this.pitch = clamp(this.pitch, -0.9, 0.85);
    }

    this.crouched = canControl && input.pressed("KeyC") && this.grounded;
    this.height = this.crouched ? CROUCH_HEIGHT : PLAYER_HEIGHT;
    this.ads = canControl && input.rightDown && !this.reloading && !this.using;

    if (canControl && input.consume("Space") && this.grounded && !this.crouched) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
    }

    const wantSprint =
      canControl &&
      input.pressed("ShiftLeft") &&
      !this.ads &&
      !this.crouched &&
      this.stamina > 5 &&
      this.grounded;
    this.sprinting = wantSprint;

    let ax = 0;
    let az = 0;
    if (canControl && !this.using) {
      if (input.pressed("KeyW")) az -= 1;
      if (input.pressed("KeyS")) az += 1;
      if (input.pressed("KeyA")) ax -= 1;
      if (input.pressed("KeyD")) ax += 1;
    }
    const moving = ax !== 0 || az !== 0;
    if (moving) {
      const len = Math.hypot(ax, az);
      ax /= len;
      az /= len;
    }

    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const wx = ax * cy - az * sy;
    const wz = ax * sy + az * cy;

    let maxSp = WALK_SPEED;
    if (this.crouched) maxSp = CROUCH_SPEED;
    else if (this.sprinting) maxSp = SPRINT_SPEED;
    if (this.ads) maxSp *= this.def.adsSlow * ADS_SPEED_MULT;
    if (this.boostT > 0) maxSp *= 1.28;
    if (this.reloading) maxSp *= 0.88;

    const accel = this.grounded ? 42 : 12;
    if (moving) {
      this.vx += wx * accel * dt;
      this.vz += wz * accel * dt;
    } else {
      const damp = this.grounded ? 14 : 2;
      this.vx -= this.vx * damp * dt;
      this.vz -= this.vz * damp * dt;
    }
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > maxSp) {
      this.vx = (this.vx / sp) * maxSp;
      this.vz = (this.vz / sp) * maxSp;
    }
    this.speed = Math.hypot(this.vx, this.vz);

    if (this.sprinting && moving) this.stamina = Math.max(0, this.stamina - 22 * dt);
    else this.stamina = Math.min(STAMINA_MAX, this.stamina + (this.crouched ? 28 : 16) * dt);

    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    const gy = groundY(this.x, this.z);
    if (this.y <= gy) {
      this.y = gy;
      this.vy = 0;
      this.grounded = true;
    }

    const nx = this.x + this.vx * dt;
    const resolvedX = resolveCircle(nx, this.z, PLAYER_RADIUS, colliders, this.y + 0.9);
    this.x = resolvedX.x;
    const nz = this.z + this.vz * dt;
    const resolvedZ = resolveCircle(this.x, nz, PLAYER_RADIUS, colliders, this.y + 0.9);
    this.z = resolvedZ.z;
    const clamped = clampToMap(this.x, this.z, 3, 98);
    this.x = clamped.x;
    this.z = clamped.z;

    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (this.using) {
      this.useT -= dt;
      if (this.useT <= 0) this.finishUse();
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.burstCd = Math.max(0, this.burstCd - dt);

    const def = this.def;
    const moveAdd = moving ? def.moveSpread : 0;
    const base = this.ads ? def.adsSpread : def.spread;
    this.spread = base + moveAdd + this.recoil * 0.02 + (this.sprinting ? 0.02 : 0);

    if (canControl && input.consume("KeyR")) this.startReload();
    if (canControl && input.consume("Digit1")) this.switchSlot(0);
    if (canControl && input.consume("Digit2")) this.switchSlot(1);
    if (canControl && input.consume("Digit3")) this.startUse("heal");
    if (canControl && input.consume("Digit4")) this.startUse("kit");

    this.footT += this.speed * dt;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw + Math.PI;
    animateSoldier(this.rig, this.speed, this.footT, this.ads, this.pitch, this.shootPulse);
  }

  switchSlot(i: number) {
    if (i === this.activeSlot || !this.slots[i] || this.using) return;
    this.activeSlot = i;
    this.reloading = false;
    this.burstLeft = 0;
    this.rebuildWeapon();
  }

  startReload() {
    const w = this.weapon;
    if (!w || this.reloading || this.using) return;
    const def = WEAPONS[w.defId];
    const mag = magFor(def, w.rarity);
    if (w.ammo >= mag) return;
    if (this.reserve[def.ammoType] <= 0) return;
    this.reloading = true;
    this.reloadT = def.reload;
    this.burstLeft = 0;
  }

  finishReload() {
    const w = this.weapon;
    this.reloading = false;
    if (!w) return;
    const def = WEAPONS[w.defId];
    const mag = magFor(def, w.rarity);
    const need = mag - w.ammo;
    const take = Math.min(need, this.reserve[def.ammoType]);
    w.ammo += take;
    this.reserve[def.ammoType] -= take;
  }

  startUse(kind: "heal" | "kit" | "boost") {
    if (this.using || this.reloading) return;
    if (kind === "heal" && this.heals <= 0) return;
    if (kind === "kit" && this.kits <= 0) return;
    if (kind === "boost" && this.boosts <= 0) return;
    if (kind === "heal" && this.health >= MAX_HEALTH) return;
    if (kind === "kit" && this.armor >= this.maxArmor() && this.armorLevel > 0) return;
    this.using = kind;
    this.useMax = kind === "heal" ? 2.4 : kind === "kit" ? 3.2 : 1.6;
    this.useT = this.useMax;
  }

  finishUse() {
    const kind = this.using;
    this.using = null;
    if (kind === "heal" && this.heals > 0) {
      this.heals--;
      this.health = Math.min(MAX_HEALTH, this.health + 50);
    } else if (kind === "kit" && this.kits > 0) {
      this.kits--;
      this.armor = this.maxArmor() || 50;
      if (this.armorLevel === 0) this.armorLevel = 1;
    } else if (kind === "boost" && this.boosts > 0) {
      this.boosts--;
      this.boostT = 8;
    }
  }

  tryFire(): boolean {
    if (!this.alive || this.reloading || this.using || this.fireCd > 0) return false;
    const w = this.weapon;
    if (!w || w.ammo <= 0) {
      this.startReload();
      return false;
    }
    const def = WEAPONS[w.defId];
    if (def.burstCount > 1 && this.burstLeft <= 0) {
      this.burstLeft = def.burstCount;
    }
    w.ammo--;
    this.fireCd = 1 / def.fireRate;
    this.recoil = Math.min(1.6, this.recoil + def.recoil);
    this.pitch -= def.recoil * 0.035;
    this.shootPulse = 1;
    if (def.burstCount > 1) {
      this.burstLeft--;
      if (this.burstLeft > 0) {
        this.fireCd = def.burstGap;
      }
    }
    return true;
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
      if (this.armor <= 0) this.armorLevel = Math.max(0, this.armorLevel);
    }
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return dmg;
  }

  giveAmmo(type: AmmoType, n: number) {
    const cap: Record<AmmoType, number> = { light: 180, heavy: 180, shells: 40, precision: 28 };
    const before = this.reserve[type];
    this.reserve[type] = Math.min(cap[type], this.reserve[type] + n);
    return this.reserve[type] > before;
  }

  giveWeapon(inst: WeaponInstance): "took" | "swap" | "full" {
    if (!this.slots[0]) {
      this.slots[0] = inst;
      this.activeSlot = 0;
      this.rebuildWeapon();
      return "took";
    }
    if (!this.slots[1]) {
      this.slots[1] = inst;
      this.activeSlot = 1;
      this.rebuildWeapon();
      return "took";
    }
    return "swap";
  }

  swapCurrent(inst: WeaponInstance): WeaponInstance | null {
    const old = this.slots[this.activeSlot];
    this.slots[this.activeSlot] = inst;
    this.reloading = false;
    this.rebuildWeapon();
    return old;
  }

  eye() {
    return {
      x: this.x,
      y: this.y + (this.crouched ? 1.05 : 1.48),
      z: this.z,
    };
  }

  muzzleWorld() {
    const eye = this.eye();
    const dist = 0.7;
    const cp = Math.cos(this.pitch);
    const lookX = Math.sin(this.yaw) * cp;
    const lookY = -Math.sin(this.pitch);
    const lookZ = Math.cos(this.yaw) * cp;
    return {
      x: eye.x + lookX * 0.35 + Math.cos(this.yaw) * 0.25,
      y: eye.y + lookY * 0.2,
      z: eye.z + lookZ * 0.35 + Math.sin(this.yaw) * 0.25,
      dx: lookX,
      dy: lookY,
      dz: lookZ,
      dist,
    };
  }

  aimDir() {
    const cp = Math.cos(this.pitch);
    return {
      x: Math.sin(this.yaw) * cp,
      y: -Math.sin(this.pitch),
      z: Math.cos(this.yaw) * cp,
    };
  }
}
