import type { AABB } from "./types";
import { MAP_SIZE } from "./config";

const CELL = 2;
const DIM = MAP_SIZE / CELL;

export class NavGrid {
  walk: Uint8Array;
  dim = DIM;
  cell = CELL;
  origin = -MAP_SIZE / 2;

  constructor(colliders: AABB[]) {
    this.walk = new Uint8Array(DIM * DIM);
    this.walk.fill(1);
    for (const c of colliders) {
      if (c.maxY - c.minY < 0.6) continue;
      const x0 = this.clampI(Math.floor((c.minX - this.origin) / CELL) - 1);
      const x1 = this.clampI(Math.floor((c.maxX - this.origin) / CELL) + 1);
      const z0 = this.clampI(Math.floor((c.minZ - this.origin) / CELL) - 1);
      const z1 = this.clampI(Math.floor((c.maxZ - this.origin) / CELL) + 1);
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          this.walk[z * DIM + x] = 0;
        }
      }
    }
  }

  private clampI(i: number) {
    return Math.max(0, Math.min(DIM - 1, i));
  }

  worldToCell(x: number, z: number) {
    return {
      x: this.clampI(Math.floor((x - this.origin) / CELL)),
      z: this.clampI(Math.floor((z - this.origin) / CELL)),
    };
  }

  cellToWorld(cx: number, cz: number) {
    return {
      x: this.origin + (cx + 0.5) * CELL,
      z: this.origin + (cz + 0.5) * CELL,
    };
  }

  isWalk(x: number, z: number) {
    const c = this.worldToCell(x, z);
    return this.walk[c.z * DIM + c.x] === 1;
  }

  nearestWalkable(x: number, z: number) {
    const c = this.worldToCell(x, z);
    if (this.walk[c.z * DIM + c.x]) return this.cellToWorld(c.x, c.z);
    for (let r = 1; r < 12; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const nx = this.clampI(c.x + dx);
          const nz = this.clampI(c.z + dz);
          if (this.walk[nz * DIM + nx]) return this.cellToWorld(nx, nz);
        }
      }
    }
    return { x, z };
  }

  /** A* with iteration cap. Returns world waypoints (including goal). */
  path(sx: number, sz: number, gx: number, gz: number, maxIter = 280): { x: number; z: number }[] {
    const start = this.worldToCell(sx, sz);
    const goal = this.worldToCell(gx, gz);
    if (start.x === goal.x && start.z === goal.z) return [{ x: gx, z: gz }];

    const dim = DIM;
    const walk = this.walk;
    const gScore = new Float32Array(dim * dim);
    gScore.fill(1e9);
    const came = new Int32Array(dim * dim);
    came.fill(-1);
    const open: number[] = [];
    const si = start.z * dim + start.x;
    const gi = goal.z * dim + goal.x;
    gScore[si] = 0;
    open.push(si);

    const heuristic = (i: number) => {
      const x = i % dim;
      const z = (i / dim) | 0;
      return Math.abs(x - goal.x) + Math.abs(z - goal.z);
    };

    let iters = 0;
    let found = false;
    while (open.length && iters++ < maxIter) {
      let best = 0;
      let bestF = 1e12;
      for (let i = 0; i < open.length; i++) {
        const f = gScore[open[i]] + heuristic(open[i]);
        if (f < bestF) {
          bestF = f;
          best = i;
        }
      }
      const cur = open[best];
      open[best] = open[open.length - 1];
      open.pop();
      if (cur === gi) {
        found = true;
        break;
      }
      const cx = cur % dim;
      const cz = (cur / dim) | 0;
      const neigh = [
        [1, 0, 1],
        [-1, 0, 1],
        [0, 1, 1],
        [0, -1, 1],
        [1, 1, 1.41],
        [1, -1, 1.41],
        [-1, 1, 1.41],
        [-1, -1, 1.41],
      ];
      for (const [dx, dz, cost] of neigh) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= dim || nz >= dim) continue;
        const ni = nz * dim + nx;
        if (!walk[ni]) continue;
        if (dx !== 0 && dz !== 0) {
          if (!walk[cz * dim + nx] || !walk[nz * dim + cx]) continue;
        }
        const tg = gScore[cur] + cost;
        if (tg < gScore[ni]) {
          gScore[ni] = tg;
          came[ni] = cur;
          if (!open.includes(ni)) open.push(ni);
        }
      }
    }

    const out: { x: number; z: number }[] = [];
    if (!found) {
      // Closest explored node toward goal
      let bestI = si;
      let bestH = heuristic(si);
      for (let i = 0; i < gScore.length; i++) {
        if (gScore[i] >= 1e8) continue;
        const h = heuristic(i);
        if (h < bestH) {
          bestH = h;
          bestI = i;
        }
      }
      let cur = bestI;
      const rev: number[] = [];
      while (cur !== -1 && rev.length < 80) {
        rev.push(cur);
        cur = came[cur];
      }
      rev.reverse();
      for (const i of rev) {
        const p = this.cellToWorld(i % dim, (i / dim) | 0);
        out.push(p);
      }
      out.push({ x: gx, z: gz });
      return out;
    }

    let cur = gi;
    const rev: number[] = [];
    while (cur !== -1 && rev.length < 120) {
      rev.push(cur);
      cur = came[cur];
    }
    rev.reverse();
    for (const i of rev) {
      out.push(this.cellToWorld(i % dim, (i / dim) | 0));
    }
    if (out.length) {
      out[out.length - 1] = { x: gx, z: gz };
    }
    return this.simplify(out);
  }

  private simplify(pts: { x: number; z: number }[]) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = out[out.length - 1];
      const b = pts[i];
      const c = pts[i + 1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const bcx = c.x - b.x;
      const bcz = c.z - b.z;
      const dot = abx * bcx + abz * bcz;
      const mag = Math.hypot(abx, abz) * Math.hypot(bcx, bcz);
      if (mag < 1e-4 || dot / mag < 0.97) out.push(b);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
}
