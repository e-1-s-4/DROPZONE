import * as THREE from "three";
import type { GameState, HudSnapshot, KillFeedItem, Notification, SettingsData } from "./types";
import {
  ARMOR_STATS,
  INTERACT_RANGE,
  MAX_HEALTH,
  TOTAL_AI,
  WEAPONS,
  dmgFor,
  magFor,
} from "./config";
import { InputManager } from "./InputManager";
import { AudioManager } from "./AudioManager";
import { SettingsManager } from "./SettingsManager";
import { rayAabb2d } from "./Collision";
import { NavGrid } from "./NavGrid";
import { buildWorld, type WorldData } from "./World";
import { Player } from "./Player";
import { Enemy, spawnEnemies, type Combatant } from "./Enemies";
import { LootSystem } from "./LootSystem";
import { ZoneManager } from "./ZoneManager";
import { Effects } from "./Effects";

export type GameCallbacks = {
  onHud: (s: HudSnapshot) => void;
  onState: (s: GameState) => void;
};

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 280);
  input = new InputManager();
  audio = new AudioManager();
  settings = new SettingsManager();
  player = new Player();
  enemies: Enemy[] = [];
  loot = new LootSystem();
  zone = new ZoneManager();
  fx = new Effects();
  world!: WorldData;
  nav!: NavGrid;
  state: GameState = "menu";
  time = 0;
  matchTime = 0;
  hudAcc = 0;
  fps = 60;
  fpsAcc = 0;
  fpsFrames = 0;
  debug = false;
  notes: Notification[] = [];
  feed: KillFeedItem[] = [];
  noteId = 1;
  hears: { x: number; z: number; radius: number; sourceId: number; t: number }[] = [];
  shake = 0;
  camDist = 6.2;
  cineT = 0;
  storming = false;
  disposed = false;
  raf = 0;
  seed = 1;
  placement = 1;
  survival = 0;
  canvas: HTMLCanvasElement;
  cb: GameCallbacks;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x6e8494);
    this.scene.fog = new THREE.Fog(0x8a9088, 48, 170);

    this.hemi = new THREE.HemisphereLight(0xb8d4ff, 0x3d2b18, 0.72);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffd6a0, 1.35);
    this.sun.position.set(-50, 90, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    this.scene.add(this.sun);

    this.world = buildWorld(this.settings.data.quality);
    this.scene.add(this.world.group);
    this.nav = new NavGrid(this.world.colliders);
    this.scene.add(this.loot.group);
    this.scene.add(this.zone.group);
    this.scene.add(this.fx.group);
    this.scene.add(this.player.mesh);
    this.player.mesh.visible = false;

    this.applyQuality(this.settings.data.quality);
    this.input.bind(canvas, {
      onUnlock: () => {
        if (this.state === "playing") this.setState("paused");
      },
    });
    this.resize();
    window.addEventListener("resize", this.resize);
    this.audio.apply(this.settings.data);
    this.zone.reset(() => this.rng());
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.emitHud();
  }

  applySettings(s: SettingsData) {
    this.settings.update(s);
    this.audio.apply(this.settings.data);
    this.camera.fov = this.settings.data.fov;
    this.camera.updateProjectionMatrix();
    this.applyQuality(this.settings.data.quality);
  }

  applyQuality(q: SettingsData["quality"]) {
    this.sun.castShadow = q === "high";
    this.renderer.shadowMap.enabled = q !== "low";
    const pr = q === "low" ? 1 : q === "medium" ? Math.min(devicePixelRatio, 1.5) : Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.far = q === "low" ? 120 : 170;
    }
  }

  setState(s: GameState) {
    this.state = s;
    this.cb.onState(s);
    if (s !== "playing") this.input.unlock();
  }

  startLoading() {
    this.audio.resume();
    this.audio.ui();
    this.setState("loading");
  }

  openDrop() {
    this.setState("drop");
  }

  beginMatch(x: number, z: number) {
    this.clearMatch();
    this.seed = (Date.now() % 99991) + 1;
    this.matchTime = 0;
    this.survival = 0;
    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.player.spawn(x, z, Math.random() * Math.PI * 2);
    this.loot.spawnAll(this.world.lootSpots, () => this.rng());
    this.zone.reset(() => this.rng());
    this.enemies = spawnEnemies(this.world.spawns, x, z, TOTAL_AI, () => this.rng());
    for (const e of this.enemies) this.scene.add(e.mesh);
    this.notes = [];
    this.feed = [];
    this.hears = [];
    this.placement = TOTAL_AI + 1;
    this.notify("Drop complete. Loot up.", "#2ee6c5");
    this.audio.startMusic();
    this.setState("playing");
    this.input.requestLock();
  }

  clearMatch() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    this.scene.remove(this.player.mesh);
    this.loot.clear();
    this.scene.remove(this.fx.group);
    this.fx.dispose();
    this.fx = new Effects();
    this.scene.add(this.fx.group);
  }

  togglePause() {
    if (this.state === "playing") {
      this.setState("paused");
      this.input.unlock();
    } else if (this.state === "paused") {
      this.setState("playing");
      this.input.requestLock();
    }
  }

  resumePlay() {
    if (this.state === "paused") {
      this.setState("playing");
      this.input.requestLock();
    }
  }

  toMenu() {
    this.clearMatch();
    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.player.mesh.visible = false;
    this.audio.stopMusic();
    this.audio.setStorm(false);
    this.setState("menu");
  }

  private rng() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    this.fpsFrames++;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.4) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }

    if (this.input.consume("F3") || this.input.consume("Backquote")) this.debug = !this.debug;
    if (this.state === "playing" && this.input.consume("Escape")) this.togglePause();
    if (this.state === "playing") this.input.consume("KeyM");

    if (this.state === "menu" || this.state === "loading" || this.state === "drop") {
      this.updateCinematic(dt);
    } else if (this.state === "playing") {
      this.updatePlay(dt);
    } else if (this.state === "paused") {
      this.updateCamera(dt);
    } else {
      this.updateCamera(dt);
    }

    this.fx.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.hudAcc += dt;
    if (this.hudAcc >= 0.05) {
      this.hudAcc = 0;
      this.emitHud();
    }
    this.input.endFrame();
  };

  private updateCinematic(dt: number) {
    this.cineT += dt * 0.12;
    const r = 92;
    const x = Math.cos(this.cineT) * r;
    const z = Math.sin(this.cineT) * r;
    this.camera.position.set(x, 42, z);
    this.camera.lookAt(0, 2, 0);
    this.player.mesh.visible = false;
  }

  private updatePlay(dt: number) {
    this.matchTime += dt;
    this.survival += dt;
    this.player.mesh.visible = true;
    if (!this.input.locked && this.input.consumeClick()) this.input.requestLock();
    this.player.update(
      dt,
      this.input,
      this.world.colliders,
      this.world.groundY,
      this.settings.data.sensitivity,
      true,
    );

    if (this.player.speed > 2.5) {
      if (this.player.footT % 0.42 < dt * this.player.speed) this.audio.footstep(this.player.sprinting);
    }

    this.zone.update(dt, () => this.rng());
    const out = this.zone.outside(this.player.x, this.player.z);
    if (out !== this.storming) {
      this.storming = out;
      this.audio.setStorm(out);
      if (out) {
        this.notify("Outside the safe zone!", "#ff4d4d");
        this.audio.zoneWarn();
      } else this.notify("Back in the safe zone.", "#2ee6c5");
    }
    if (out && this.player.alive) {
      this.player.takeDamage(this.zone.dps * dt, false);
      if (!this.player.alive) this.onPlayerDeath("Storm");
    }

    this.handleCombat(dt);
    this.handleInteract();
    this.loot.update(this.time);

    const combatants = this.allCombatants();
    const hears = this.hears.filter((h) => this.time - h.t < 1.6);
    this.hears = hears;

    const ctxBase = {
      time: this.time,
      colliders: this.world.colliders,
      nav: this.nav,
      loot: this.loot,
      zone: this.zone,
      cover: this.world.cover,
      combatants,
      hears,
      groundY: this.world.groundY,
    };

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.alive && this.zone.outside(e.x, e.z)) e.takeDamage(this.zone.dps * dt, false);
      e.update(dt, {
        ...ctxBase,
        onShot: (self, target, aim, dist) => this.aiFire(self, target, aim, dist),
      });
      if (!e.alive && !e.mesh.userData.counted) this.onEnemyDown(e, "Storm");
    }

    this.updateCamera(dt, false);
    this.checkEnd();
  }

  private handleCombat(_dt: number) {
    const wantFire = this.input.mouseDown;
    if (wantFire && this.player.alive) {
      const def = this.player.def;
      const fired = this.player.tryFire();
      if (fired) {
        this.audio.shot(def.class);
        this.shake = Math.min(0.35, this.shake + def.recoil * 0.08);
        const muz = this.player.muzzleWorld();
        this.fx.muzzle(muz.x, muz.y, muz.z);
        this.hears.push({ x: this.player.x, z: this.player.z, radius: 48, sourceId: 1, t: this.time });
        const pellets = def.pellets;
        for (let i = 0; i < pellets; i++) this.playerHitscan();
        if (this.player.weapon && this.player.weapon.ammo === 0) this.player.startReload();
      }
    }
    if (this.player.reloading && this.player.reloadT > this.player.def.reload - 0.04) {
      if (!this.player.mesh.userData.reloadSfx) {
        this.player.mesh.userData.reloadSfx = true;
        this.audio.reload();
      }
    } else if (!this.player.reloading) {
      this.player.mesh.userData.reloadSfx = false;
    }
  }

  private playerHitscan() {
    const def = this.player.def;
    const rarity = this.player.weapon?.rarity ?? "standard";
    const origin = this.camera.position;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const spread = this.player.spread;
    const ox = (Math.random() - 0.5) * spread * 2;
    const oy = (Math.random() - 0.5) * spread * 2;
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, ox).addScaledVector(up, oy).normalize();
    let dx = dir.x;
    let dy = dir.y;
    let dz = dir.z;
    const maxR = def.range;
    const muz = this.player.muzzleWorld();
    const hit = this.hitscan(origin.x, origin.y, origin.z, dx, dy, dz, maxR, 1);
    const end = hit
      ? { x: hit.x, y: hit.y, z: hit.z }
      : { x: origin.x + dx * maxR, y: origin.y + dy * maxR, z: origin.z + dz * maxR };
    this.fx.tracer(muz.x, muz.y, muz.z, end.x, end.y, end.z);
    if (!hit) {
      this.fx.impact(end.x, end.y, end.z, 3);
      return;
    }
    this.fx.impact(hit.x, hit.y, hit.z, hit.entity ? 8 : 4);
    if (hit.entity && !hit.entity.isPlayer) {
      const enemy = this.enemies.find((e) => e.id === hit.entity!.id);
      if (!enemy || !enemy.alive) return;
      const dmg = dmgFor(def, rarity) * (hit.head ? def.headshot : 1);
      const applied = enemy.takeDamage(dmg, hit.head);
      this.playerHitConfirm(hit.head, applied);
      if (!enemy.alive) this.onEnemyDown(enemy, "You");
    }
  }

  private playerHitConfirm(head: boolean, dmg: number) {
    this.audio.hit();
    this._hitMarker = 1;
    this._headMarker = head;
    this.fx.damageNumber(
      this.player.x + Math.sin(this.player.yaw) * 2,
      this.player.y + 1.8,
      this.player.z + Math.cos(this.player.yaw) * 2,
      `${Math.round(dmg)}${head ? " HS" : ""}`,
      head ? "#fbbf24" : "#ffffff",
    );
  }

  _hitMarker = 0;
  _headMarker = false;
  _hurt = 0;
  mapOpen = false;
  invOpen = false;

  private aiFire(self: Enemy, target: Combatant, aim: number, dist: number) {
    const def = self.def;
    this.audio.shot(def.class, Math.hypot(self.x - this.player.x, self.z - this.player.z));
    this.hears.push({ x: self.x, z: self.z, radius: 42, sourceId: self.id, t: this.time });
    const eyeY = self.y + 1.45;
    const tx = target.x;
    const ty = target.y + (target.height > 1.4 ? 1.3 : 0.9);
    const tz = target.z;
    let dx = tx - self.x;
    let dy = ty - eyeY;
    let dz = tz - self.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    dx /= L;
    dy /= L;
    dz /= L;
    const miss = Math.random() > aim;
    if (miss) {
      dx += (Math.random() - 0.5) * 0.12;
      dy += (Math.random() - 0.5) * 0.08;
      dz += (Math.random() - 0.5) * 0.12;
    }
    const hit = this.hitscan(self.x, eyeY, self.z, dx, dy, dz, def.range, self.id);
    const end = hit
      ? { x: hit.x, y: hit.y, z: hit.z }
      : { x: self.x + dx * Math.min(dist, def.range), y: eyeY + dy * dist, z: self.z + dz * dist };
    this.fx.tracer(self.x, eyeY, self.z, end.x, end.y, end.z);
    if (!hit?.entity) return;
    const dmg = dmgFor(def, self.weapon.rarity) * (hit.head ? def.headshot : 1);
    if (hit.entity.isPlayer) {
      const before = this.player.health;
      this.player.takeDamage(dmg, hit.head);
      this._hurt = 1;
      this.shake = 0.2;
      this.audio.hurt();
      if (!this.player.alive && before > 0) this.onPlayerDeath(self.name);
    } else {
      const victim = this.enemies.find((e) => e.id === hit.entity!.id);
      if (victim && victim.alive) {
        victim.takeDamage(dmg, hit.head);
        if (!victim.alive) {
          self.kills++;
          this.onEnemyDown(victim, self.name);
        }
      }
    }
  }

  private hitscan(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxR: number,
    ignoreId: number,
  ): { x: number; y: number; z: number; entity: Combatant | null; head: boolean } | null {
    let bestT = maxR;
    let wall = false;
    for (const c of this.world.colliders) {
      if (c.maxY < 0.5) continue;
      const t = rayAabb2d(ox, oz, dx, dz, c, bestT);
      if (t > 0.2 && t < bestT) {
        const y = oy + dy * t;
        if (y >= c.minY - 0.2 && y <= c.maxY + 0.2) {
          bestT = t;
          wall = true;
        }
      }
    }
    let ent: Combatant | null = null;
    let head = false;
    const bodies = this.allCombatants();
    for (const b of bodies) {
      if (!b.alive || b.id === ignoreId) continue;
      const t = rayVsCylinder(ox, oy, oz, dx, dy, dz, b.x, b.y, b.z, 0.48, b.height, maxR);
      if (t != null && t < bestT) {
        bestT = t;
        ent = b;
        wall = false;
        const hy = oy + dy * t;
        head = hy > b.y + b.height * 0.72;
      }
    }
    if (bestT >= maxR && !ent && !wall) return null;
    return {
      x: ox + dx * bestT,
      y: oy + dy * bestT,
      z: oz + dz * bestT,
      entity: ent,
      head,
    };
  }

  private handleInteract() {
    if (this.input.consume("Tab")) this.invOpen = !this.invOpen;
    if (this.input.consume("KeyM")) this.mapOpen = !this.mapOpen;
    const near = this.loot.nearest(this.player.x, this.player.z, INTERACT_RANGE);
    if (near && near.kind === "ammo" && near.ammoType) {
      if (this.player.giveAmmo(near.ammoType, near.ammoCount ?? 10)) {
        this.loot.take(near);
        this.audio.pickup();
        this.notify(`+${near.ammoCount} ${near.ammoType} ammo`, "#e5e7eb");
      }
    }
    if (this.input.consume("KeyE") && near) {
      this.pickup(near);
    }
  }

  pickup(near: ReturnType<LootSystem["nearest"]>) {
    if (!near) return;
    if (near.kind === "weapon" && near.weapon) {
      const res = this.player.giveWeapon(near.weapon);
      if (res === "took") {
        this.loot.take(near);
        this.audio.pickup();
        this.notify(`Equipped ${WEAPONS[near.weapon.defId].name}`, rarityHex(near.weapon.rarity));
      } else if (res === "swap") {
        const old = this.player.swapCurrent(near.weapon);
        this.loot.take(near);
        if (old) this.loot.dropWeapon(this.player.x, this.player.z, old);
        this.audio.pickup();
        this.notify(`Swapped to ${WEAPONS[near.weapon.defId].name}`, rarityHex(near.weapon.rarity));
      }
    } else if (near.kind === "armor") {
      const lvl = near.armorLevel ?? 1;
      if (lvl >= this.player.armorLevel) {
        this.player.armorLevel = lvl;
        this.player.armor = ARMOR_STATS[lvl].hp;
        this.loot.take(near);
        this.audio.pickup();
        this.notify(`Mk.${lvl} armor equipped`, "#60a5fa");
      } else this.notify("Weaker armor — ignored", "#9ca3af");
    } else if (near.kind === "heal") {
      this.player.heals = Math.min(4, this.player.heals + 1);
      this.loot.take(near);
      this.audio.pickup();
      this.notify("Field Stim acquired", "#4ade80");
    } else if (near.kind === "armorKit") {
      this.player.kits = Math.min(3, this.player.kits + 1);
      this.loot.take(near);
      this.audio.pickup();
      this.notify("Plate Kit acquired", "#38bdf8");
    } else if (near.kind === "boost") {
      this.player.boosts = Math.min(3, this.player.boosts + 1);
      this.loot.take(near);
      this.audio.pickup();
      this.notify("Adrenal Surge acquired", "#f472b6");
    } else if (near.kind === "ammo" && near.ammoType) {
      this.player.giveAmmo(near.ammoType, near.ammoCount ?? 10);
      this.loot.take(near);
      this.audio.pickup();
    }
  }

  private onEnemyDown(e: Enemy, killer: string) {
    if (e.mesh.userData.counted) return;
    e.mesh.userData.counted = true;
    e.alive = false;
    e.health = 0;
    this.feed.unshift({
      id: this.noteId++,
      killer,
      victim: e.name,
      weapon: WEAPONS[e.weapon.defId].name,
      t: this.time,
    });
    this.feed = this.feed.slice(0, 6);
    if (killer === "You") {
      this.player.kills++;
      this.notify(`Eliminated ${e.name}`, "#f0a020");
      this.audio.kill();
    }
    this.loot.dropWeapon(e.x, e.z, e.weapon);
    if (e.armorLevel > 0) this.loot.spawnArmor(e.x + 0.8, e.z, () => Math.random());
  }

  private onPlayerDeath(killer: string) {
    this.player.alive = false;
    this.placement = 1 + this.enemies.filter((e) => e.alive).length;
    this.feed.unshift({
      id: this.noteId++,
      killer,
      victim: "You",
      weapon: "",
      t: this.time,
    });
    this.audio.defeat();
    this.audio.setStorm(false);
    this.setState("dead");
  }

  private checkEnd() {
    if (this.state !== "playing") return;
    const aliveAi = this.enemies.filter((e) => e.alive).length;
    if (this.player.alive && aliveAi === 0) {
      this.placement = 1;
      this.audio.victory();
      this.audio.setStorm(false);
      this.setState("victory");
    }
  }

  private allCombatants(): Combatant[] {
    const list: Combatant[] = [
      {
        id: 1,
        name: "You",
        x: this.player.x,
        y: this.player.y,
        z: this.player.z,
        yaw: this.player.yaw,
        health: this.player.health,
        armor: this.player.armor,
        armorLevel: this.player.armorLevel,
        alive: this.player.alive,
        isPlayer: true,
        height: this.player.height,
      },
    ];
    for (const e of this.enemies) list.push(e.asCombatant());
    return list;
  }

  private updateCamera(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this._hitMarker = Math.max(0, this._hitMarker - dt * 4);
    this._hurt = Math.max(0, this._hurt - dt * 1.6);
    const ads = this.player.ads && this.state === "playing";
    const targetDist = ads ? 3.4 : 6.2;
    this.camDist += (targetDist - this.camDist) * Math.min(1, dt * 8);
    const pitch = this.player.pitch;
    const yaw = this.player.yaw;
    const lookX = Math.sin(yaw) * Math.cos(pitch);
    const lookY = -Math.sin(pitch);
    const lookZ = Math.cos(yaw) * Math.cos(pitch);
    const px = this.player.x;
    const py = this.player.y + (this.player.crouched ? 1.15 : 1.42);
    const pz = this.player.z;
    let cx = px - lookX * this.camDist + Math.cos(yaw) * 0.85;
    let cy = py - lookY * this.camDist + 0.55;
    let cz = pz - lookZ * this.camDist + Math.sin(yaw) * 0.85;
    cy = Math.max(this.player.y + 0.4, cy);
    if (this.shake > 0) {
      cx += (Math.random() - 0.5) * this.shake;
      cy += (Math.random() - 0.5) * this.shake * 0.5;
      cz += (Math.random() - 0.5) * this.shake;
    }
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(px + lookX * 8, py + lookY * 8, pz + lookZ * 8);
    this.camera.fov = ads ? this.settings.data.fov - 12 : this.settings.data.fov;
    this.camera.updateProjectionMatrix();
  }

  notify(text: string, color: string) {
    this.notes.unshift({ id: this.noteId++, text, color, t: this.time });
    this.notes = this.notes.slice(0, 5);
  }

  prompt(): string | null {
    const n = this.loot.nearest(this.player.x, this.player.z, INTERACT_RANGE);
    if (!n) return null;
    return `[E]  ${this.loot.label(n)}`;
  }

  emitHud() {
    const w = this.player.weapon;
    const def = this.player.def;
    const alive = (this.player.alive ? 1 : 0) + this.enemies.filter((e) => e.alive).length;
    const snap: HudSnapshot = {
      state: this.state,
      health: this.player.health,
      maxHealth: MAX_HEALTH,
      armor: this.player.armor,
      maxArmor: Math.max(1, this.player.maxArmor()),
      armorLevel: this.player.armorLevel,
      stamina: this.player.stamina,
      weaponName: w ? def.name : "—",
      weaponClass: w ? def.class : "",
      rarity: w?.rarity ?? null,
      ammo: w?.ammo ?? 0,
      mag: w ? magFor(def, w.rarity) : 0,
      reserve: w ? this.player.reserve[def.ammoType] : 0,
      ammoType: w ? def.ammoType : null,
      reloading: this.player.reloading,
      reloadT: this.player.reloading ? 1 - this.player.reloadT / def.reload : 0,
      aliveCount: alive,
      totalPlayers: TOTAL_AI + 1,
      kills: this.player.kills,
      matchTime: this.matchTime,
      zonePhase: this.zone.phase,
      zoneLabel: this.zone.label(),
      zoneCountdown: this.zone.timer,
      shrinking: this.zone.shrinking,
      inZone: !this.zone.outside(this.player.x, this.player.z),
      zoneDist: this.zone.distToSafe(this.player.x, this.player.z),
      zoneDmg: this.zone.dps,
      prompt: this.state === "playing" ? this.prompt() : null,
      notifications: this.notes.filter((n) => this.time - n.t < 3.2),
      killFeed: this.feed.filter((k) => this.time - k.t < 6),
      playerX: this.player.x,
      playerZ: this.player.z,
      playerYaw: this.player.yaw,
      zoneCx: this.zone.cx,
      zoneCz: this.zone.cz,
      zoneR: this.zone.r,
      nextCx: this.zone.nextCx,
      nextCz: this.zone.nextCz,
      nextR: this.zone.nextR,
      enemies: this.enemies.map((e) => ({ x: e.x, z: e.z, alive: e.alive, yaw: e.yaw })),
      loot: this.loot.items.filter((i) => !i.taken).map((i) => ({ x: i.x, z: i.z, color: 1 })),
      spread: this.player.spread,
      ads: this.player.ads,
      crouched: this.player.crouched,
      sprinting: this.player.sprinting,
      hurtFlash: this._hurt,
      hitMarker: this._hitMarker,
      headMarker: this._headMarker,
      fps: this.fps,
      debug: this.debug,
      debugLines: this.debug
        ? [
            `pos ${this.player.x.toFixed(1)}, ${this.player.z.toFixed(1)} y ${this.player.y.toFixed(1)}`,
            `hp ${this.player.health.toFixed(0)} arm ${this.player.armor.toFixed(0)}`,
            `weapon ${def.name} ammo ${w?.ammo ?? 0}`,
            `ai ${this.enemies.filter((e) => e.alive).length}/${this.enemies.length}`,
            `zone r ${this.zone.r.toFixed(1)} phase ${this.zone.phase} ${this.zone.shrinking ? "shrink" : "wait"}`,
            `entities ${this.enemies.length + this.loot.items.length}`,
            `fps ${this.fps.toFixed(0)}`,
          ]
        : [],
      heals: this.player.heals,
      kits: this.player.kits,
      boosts: this.player.boosts,
      ammoCounts: { ...this.player.reserve },
      slots: [...this.player.slots],
      activeSlot: this.player.activeSlot,
      placement: this.placement,
      survivalTime: this.survival,
      usingItem: this.player.using,
      useProgress: this.player.using ? 1 - this.player.useT / this.player.useMax : 0,
    };
    this.cb.onHud(snap);
  }

  resize = () => {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.input.dispose();
    this.audio.dispose();
    this.renderer.dispose();
  }
}

function rarityHex(r: string) {
  if (r === "apex") return "#f59e0b";
  if (r === "superior") return "#38bdf8";
  if (r === "refined") return "#34d399";
  return "#e5e7eb";
}

function rayVsCylinder(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  h: number,
  maxT: number,
): number | null {
  const ex = ox - cx;
  const ez = oz - cz;
  const a = dx * dx + dz * dz;
  const b = 2 * (ex * dx + ez * dz);
  const c = ex * ex + ez * ez - r * r;
  let t = maxT;
  if (a < 1e-8) {
    if (c > 0) return null;
    t = 0;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const s = Math.sqrt(disc);
    const t0 = (-b - s) / (2 * a);
    const t1 = (-b + s) / (2 * a);
    t = t0 >= 0 ? t0 : t1;
    if (t < 0 || t > maxT) return null;
  }
  const y = oy + dy * t;
  if (y < cy - 0.1 || y > cy + h + 0.1) return null;
  return t;
}


