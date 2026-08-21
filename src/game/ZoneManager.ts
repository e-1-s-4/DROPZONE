import * as THREE from "three";
import { ZONE_PHASES } from "./config";
import { lerp } from "./Collision";

export class ZoneManager {
  cx = 0;
  cz = 0;
  r = 130;
  nextCx = 0;
  nextCz = 0;
  nextR = 118;
  phase = 0;
  timer = ZONE_PHASES[0].wait;
  shrinking = false;
  elapsed = 0;
  shrinkDur = 1;
  fromCx = 0;
  fromCz = 0;
  fromR = 130;
  dps = 1;
  group = new THREE.Group();
  private ring: THREE.Mesh;
  private nextRing: THREE.Mesh;
  private wall: THREE.Mesh;
  private stormMat: THREE.MeshBasicMaterial;

  constructor() {
    const ringGeo = new THREE.RingGeometry(0.98, 1.0, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2ee6c5,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.position.y = 0.12;
    this.group.add(this.ring);

    const nextMat = new THREE.MeshBasicMaterial({
      color: 0xf0a020,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    this.nextRing = new THREE.Mesh(ringGeo.clone(), nextMat);
    this.nextRing.position.y = 0.14;
    this.group.add(this.nextRing);

    this.stormMat = new THREE.MeshBasicMaterial({
      color: 0x6d28d9,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wallGeo = new THREE.CylinderGeometry(1, 1, 28, 64, 1, true);
    this.wall = new THREE.Mesh(wallGeo, this.stormMat);
    this.wall.position.y = 14;
    this.group.add(this.wall);
  }

  reset(rng: () => number) {
    this.phase = 0;
    this.shrinking = false;
    this.elapsed = 0;
    this.cx = (rng() - 0.5) * 20;
    this.cz = (rng() - 0.5) * 20;
    this.r = 130;
    this.pickNext(rng);
    this.timer = ZONE_PHASES[0].wait;
    this.dps = ZONE_PHASES[0].dps;
    this.syncVisuals();
  }

  private pickNext(rng: () => number) {
    const phase = ZONE_PHASES[Math.min(this.phase, ZONE_PHASES.length - 1)];
    this.nextR = phase.radius;
    const maxOff = Math.max(0, this.r - this.nextR) * 0.72;
    const ang = rng() * Math.PI * 2;
    const dist = rng() * maxOff;
    this.nextCx = this.cx + Math.cos(ang) * dist;
    this.nextCz = this.cz + Math.sin(ang) * dist;
    const lim = 70;
    this.nextCx = Math.max(-lim, Math.min(lim, this.nextCx));
    this.nextCz = Math.max(-lim, Math.min(lim, this.nextCz));
  }

  update(dt: number, rng: () => number) {
    this.elapsed += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      if (!this.shrinking) {
        if (this.phase >= ZONE_PHASES.length - 1 && this.r <= ZONE_PHASES[ZONE_PHASES.length - 1].radius + 0.2) {
          this.timer = 999;
          return;
        }
        this.shrinking = true;
        this.fromCx = this.cx;
        this.fromCz = this.cz;
        this.fromR = this.r;
        this.shrinkDur = Math.max(0.1, ZONE_PHASES[Math.min(this.phase, ZONE_PHASES.length - 1)].shrink);
        this.timer = this.shrinkDur;
      } else {
        this.cx = this.nextCx;
        this.cz = this.nextCz;
        this.r = this.nextR;
        this.shrinking = false;
        this.phase = Math.min(this.phase + 1, ZONE_PHASES.length - 1);
        this.dps = ZONE_PHASES[this.phase].dps;
        this.pickNext(rng);
        this.timer = ZONE_PHASES[this.phase].wait;
      }
    }
    if (this.shrinking) {
      const t = 1 - Math.max(0, this.timer) / this.shrinkDur;
      const e = t * t * (3 - 2 * t);
      this.cx = lerp(this.fromCx, this.nextCx, e);
      this.cz = lerp(this.fromCz, this.nextCz, e);
      this.r = lerp(this.fromR, this.nextR, e);
    }
    this.syncVisuals();
    this.stormMat.opacity = 0.12 + Math.sin(this.elapsed * 2) * 0.04;
  }

  private syncVisuals() {
    this.ring.position.x = this.cx;
    this.ring.position.z = this.cz;
    this.ring.scale.set(this.r, 1, this.r);
    this.wall.position.x = this.cx;
    this.wall.position.z = this.cz;
    this.wall.scale.set(this.r, 1, this.r);
    this.nextRing.position.x = this.nextCx;
    this.nextRing.position.z = this.nextCz;
    this.nextRing.scale.set(this.nextR, 1, this.nextR);
    this.nextRing.visible = !this.shrinking && this.phase < ZONE_PHASES.length - 1;
  }

  outside(x: number, z: number) {
    const dx = x - this.cx;
    const dz = z - this.cz;
    return dx * dx + dz * dz > this.r * this.r;
  }

  distToSafe(x: number, z: number) {
    const d = Math.hypot(x - this.cx, z - this.cz);
    return d - this.r;
  }

  randomInside(rng: () => number, margin = 0.7) {
    const ang = rng() * Math.PI * 2;
    const rad = Math.sqrt(rng()) * this.nextR * margin;
    return { x: this.nextCx + Math.cos(ang) * rad, z: this.nextCz + Math.sin(ang) * rad };
  }

  label() {
    return ZONE_PHASES[Math.min(this.phase, ZONE_PHASES.length - 1)].label;
  }
}
