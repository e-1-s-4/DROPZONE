import type { AABB } from "./types";

export function aabbOverlap(a: AABB, b: AABB) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function pointInAabb(x: number, z: number, b: AABB) {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

export function circleHitsAabb(
  x: number,
  z: number,
  r: number,
  b: AABB,
): { hit: boolean; nx: number; nz: number } {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return { hit: false, nx: x, nz: z };
  if (d2 < 1e-8) {
    // Deep inside — push toward nearest edge
    const left = x - b.minX;
    const right = b.maxX - x;
    const top = z - b.minZ;
    const bot = b.maxZ - z;
    const m = Math.min(left, right, top, bot);
    if (m === left) return { hit: true, nx: b.minX - r, nz: z };
    if (m === right) return { hit: true, nx: b.maxX + r, nz: z };
    if (m === top) return { hit: true, nx: x, nz: b.minZ - r };
    return { hit: true, nx: x, nz: b.maxZ + r };
  }
  const d = Math.sqrt(d2);
  const push = (r - d) / d;
  return { hit: true, nx: x + dx * push, nz: z + dz * push };
}

export function resolveCircle(
  x: number,
  z: number,
  r: number,
  colliders: AABB[],
  y = 0.9,
): { x: number; z: number } {
  let nx = x;
  let nz = z;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (y < c.minY - 0.2 || y > c.maxY + 0.2) continue;
    const res = circleHitsAabb(nx, nz, r, c);
    if (res.hit) {
      nx = res.nx;
      nz = res.nz;
    }
  }
  return { x: nx, z: nz };
}

/** 2D ray vs AABB. Returns t in [0, maxT] or -1. */
export function rayAabb2d(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  b: AABB,
  maxT: number,
): number {
  let tmin = 0;
  let tmax = maxT;
  if (Math.abs(dx) < 1e-8) {
    if (ox < b.minX || ox > b.maxX) return -1;
  } else {
    let t1 = (b.minX - ox) / dx;
    let t2 = (b.maxX - ox) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  if (Math.abs(dz) < 1e-8) {
    if (oz < b.minZ || oz > b.maxZ) return -1;
  } else {
    let t1 = (b.minZ - oz) / dz;
    let t2 = (b.maxZ - oz) / dz;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : -1;
}

export function losBlocked(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  colliders: AABB[],
  eyeY = 1.4,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return false;
  const inv = 1 / len;
  const rx = dx * inv;
  const rz = dz * inv;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY < eyeY - 0.4) continue;
    const t = rayAabb2d(ax, az, rx, rz, c, len);
    if (t > 0.35 && t < len - 0.35) return true;
  }
  return false;
}

export function clampToMap(x: number, z: number, margin = 2, half = 98) {
  return {
    x: Math.max(-half + margin, Math.min(half - margin, x)),
    z: Math.max(-half + margin, Math.min(half - margin, z)),
  };
}

export function dist2(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function randRange(a: number, b: number, rng = Math.random) {
  return a + rng() * (b - a);
}

export function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function hash01(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
