import * as THREE from "three";
import type { AABB } from "./types";
import { hash01 } from "./Collision";

export interface CoverPoint {
  x: number;
  z: number;
}

export interface LootSpot {
  x: number;
  z: number;
  indoor: boolean;
}

export interface WorldData {
  group: THREE.Group;
  colliders: AABB[];
  cover: CoverPoint[];
  lootSpots: LootSpot[];
  spawns: { x: number; z: number }[];
  pois: { name: string; x: number; z: number }[];
  groundY: (x: number, z: number) => number;
}

function aabb(x: number, z: number, w: number, d: number, y0 = 0, y1 = 4): AABB {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y0, maxY: y1 };
}

export function buildWorld(quality: "low" | "medium" | "high"): WorldData {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const cover: CoverPoint[] = [];
  const lootSpots: LootSpot[] = [];
  const spawns: { x: number; z: number }[] = [];

  const wallMat = (color: number, rough = 0.86) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.08 });

  const mats = {
    sand: wallMat(0xc4a574, 0.95),
    grass: wallMat(0x5a7a3a, 0.95),
    dirt: wallMat(0x8a6b45, 0.95),
    asphalt: wallMat(0x3a3d42, 0.9),
    town: wallMat(0xc4a484),
    roof: wallMat(0x6b3a2a, 0.8),
    metal: wallMat(0x6d6358, 0.45),
    rust: wallMat(0x8a4a32, 0.55),
    warehouse: wallMat(0x4d5a66, 0.5),
    crate: wallMat(0xb45309, 0.7),
    dark: wallMat(0x2a2e33, 0.7),
    rock: wallMat(0x7a7368, 0.95),
    pine: wallMat(0x2f4a28, 0.9),
    trunk: wallMat(0x4a3322, 0.95),
    window: new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    }),
  };

  const addMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotY = 0,
    shadow = true,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.y = rotY;
    m.castShadow = shadow && quality !== "low";
    m.receiveShadow = quality !== "low";
    group.add(m);
    return m;
  };

  // Ground biomes
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  addMesh(plane, mats.sand, 0, 0, 0, 200, 1, 200, 0, false);

  addMesh(plane, mats.grass, -55, 0.02, 52, 70, 1, 70, 0, false);
  addMesh(plane, mats.dirt, 10, 0.02, 8, 80, 1, 70, 0, false);
  addMesh(plane, mats.asphalt, 0, 0.03, -8, 170, 1, 10, 0, false);
  addMesh(plane, mats.asphalt, 4, 0.035, 8, 10, 1, 160, 0, false);
  addMesh(plane, mats.asphalt, 52, 0.03, -48, 8, 1, 50, 0, false);
  addMesh(plane, mats.asphalt, -52, 0.03, -48, 8, 1, 40, 0, false);
  addMesh(plane, mats.asphalt, 52, 0.03, 48, 8, 1, 40, 0, false);

  // Hill
  addMesh(new THREE.BoxGeometry(1, 1, 1), mats.rock, -12, 2.4, 72, 32, 4.8, 28);
  addMesh(new THREE.BoxGeometry(1, 1, 1), mats.rock, -12, 1.2, 56, 14, 2.4, 10);
  addMesh(new THREE.BoxGeometry(1, 1, 1), mats.rock, -12, 0.5, 48, 10, 1, 8);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  const addColliderMesh = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    rotY = 0,
  ) => {
    addMesh(boxGeo, mat, x, y, z, w, h, d, rotY);
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
    });
  };

  const addBuilding = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    wall: THREE.Material,
    roof: THREE.Material,
    door: "n" | "s" | "e" | "w",
    windows = true,
  ) => {
    const t = 0.45;
    const doorW = 1.7;
    // Floor
    addMesh(boxGeo, mats.dark, x, 0.04, z, w - 0.2, 0.08, d - 0.2, 0, false);
    // Roof
    addMesh(boxGeo, roof, x, h + 0.15, z, w + 0.4, 0.3, d + 0.4);

    const walls: { x: number; z: number; w: number; d: number }[] = [];
    // North (+z)
    if (door === "n") {
      const gap = doorW;
      const left = (w - gap) / 2;
      walls.push({ x: x - w / 2 + left / 2, z: z + d / 2, w: left, d: t });
      walls.push({ x: x + w / 2 - left / 2, z: z + d / 2, w: left, d: t });
    } else walls.push({ x, z: z + d / 2, w, d: t });
    // South
    if (door === "s") {
      const gap = doorW;
      const left = (w - gap) / 2;
      walls.push({ x: x - w / 2 + left / 2, z: z - d / 2, w: left, d: t });
      walls.push({ x: x + w / 2 - left / 2, z: z - d / 2, w: left, d: t });
    } else walls.push({ x, z: z - d / 2, w, d: t });
    // East (+x)
    if (door === "e") {
      const gap = doorW;
      const left = (d - gap) / 2;
      walls.push({ x: x + w / 2, z: z - d / 2 + left / 2, w: t, d: left });
      walls.push({ x: x + w / 2, z: z + d / 2 - left / 2, w: t, d: left });
    } else walls.push({ x: x + w / 2, z, w: t, d });
    // West
    if (door === "w") {
      const gap = doorW;
      const left = (d - gap) / 2;
      walls.push({ x: x - w / 2, z: z - d / 2 + left / 2, w: t, d: left });
      walls.push({ x: x - w / 2, z: z + d / 2 - left / 2, w: t, d: left });
    } else walls.push({ x: x - w / 2, z, w: t, d });

    for (const wl of walls) {
      addColliderMesh(wl.x, h / 2, wl.z, wl.w, h, wl.d, wall);
    }

    if (windows && quality !== "low") {
      const wy = h * 0.55;
      if (door !== "n") addMesh(boxGeo, mats.window, x, wy, z + d / 2 + 0.02, 0.8, 0.55, 0.08, 0, false);
      if (door !== "s") addMesh(boxGeo, mats.window, x, wy, z - d / 2 - 0.02, 0.8, 0.55, 0.08, 0, false);
    }

    lootSpots.push({ x, z, indoor: true });
    lootSpots.push({ x: x + w * 0.22, z: z - d * 0.18, indoor: true });
    cover.push({ x: x + w / 2 + 1.2, z: z + d / 2 + 0.4 });
    cover.push({ x: x - w / 2 - 1.2, z: z - d / 2 - 0.4 });
  };

  const addProp = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
    addColliderMesh(x, h / 2, z, w, h, d, mat);
    cover.push({ x: x + w / 2 + 0.8, z });
    cover.push({ x: x - w / 2 - 0.8, z });
  };

  // ---- OLD TOWN ----
  const townHouses: [number, number, number, number, number, "n" | "s" | "e" | "w"][] = [
    [-68, -58, 10, 8, 4.2, "s"],
    [-54, -60, 9, 8, 3.8, "e"],
    [-42, -52, 11, 9, 4.6, "s"],
    [-66, -42, 8, 8, 3.6, "n"],
    [-52, -42, 10, 8, 4.0, "w"],
    [-40, -38, 8, 7, 3.5, "s"],
    [-70, -28, 9, 8, 4.1, "e"],
    [-48, -28, 12, 9, 5.0, "s"],
    [-58, -70, 8, 7, 3.4, "n"],
  ];
  for (const [x, z, w, d, h, door] of townHouses) {
    addBuilding(x, z, w, d, h, mats.town, mats.roof, door);
  }
  addProp(-60, -50, 1.4, 1.1, 1.4, mats.crate);
  addProp(-46, -46, 1.6, 1.2, 1.2, mats.crate);
  addProp(-62, -34, 1.2, 1.4, 1.2, mats.dark);

  // ---- IRONWORKS ----
  addBuilding(48, -62, 18, 12, 7, mats.rust, mats.metal, "s", false);
  addBuilding(68, -58, 14, 16, 8, mats.metal, mats.rust, "w", false);
  addBuilding(52, -40, 16, 10, 6, mats.rust, mats.metal, "n", false);
  addBuilding(70, -38, 10, 10, 5.5, mats.metal, mats.dark, "s", false);
  addBuilding(38, -50, 10, 8, 4.5, mats.rust, mats.metal, "e", false);
  // chimneys
  addColliderMesh(44, 6, -62, 1.6, 12, 1.6, mats.dark);
  addColliderMesh(72, 7, -52, 1.8, 14, 1.8, mats.rust);
  addProp(58, -48, 2.2, 2.4, 2.2, mats.metal);
  addProp(62, -44, 1.8, 1.6, 1.8, mats.crate);
  addProp(42, -44, 2.4, 1.2, 1.4, mats.dark);

  // ---- DRYDOCK / WAREHOUSE ----
  addBuilding(62, 48, 22, 14, 6.5, mats.warehouse, mats.metal, "w", false);
  addBuilding(42, 58, 16, 12, 6, mats.warehouse, mats.dark, "s", false);
  addBuilding(70, 68, 14, 10, 5.5, mats.metal, mats.warehouse, "s", false);
  addBuilding(48, 42, 10, 8, 4.2, mats.warehouse, mats.metal, "n", false);
  // containers
  const contColors = [0x1d4ed8, 0xb45309, 0x166534, 0x9f1239];
  for (let i = 0; i < 10; i++) {
    const cx = 56 + (i % 5) * 5.4;
    const cz = 32 + Math.floor(i / 5) * 6.2;
    addProp(cx, cz, 4.4, 2.4, 2.2, wallMat(contColors[i % 4], 0.5));
    lootSpots.push({ x: cx, z: cz + 2.2, indoor: false });
  }

  // ---- PINE HOLLOW ----
  addBuilding(-70, 42, 10, 8, 3.8, mats.town, mats.roof, "e");
  addBuilding(-48, 58, 9, 8, 3.6, mats.town, mats.roof, "s");
  addBuilding(-62, 68, 8, 7, 3.4, mats.town, mats.roof, "w");

  const treeGeo = new THREE.ConeGeometry(1.6, 4.2, 6);
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.2, 5);
  const treeCount = quality === "low" ? 28 : quality === "high" ? 70 : 48;
  for (let i = 0; i < treeCount; i++) {
    const x = -88 + hash01(i * 3.1) * 55;
    const z = 28 + hash01(i * 7.7) * 58;
    if (Math.hypot(x + 70, z - 42) < 8) continue;
    addMesh(trunkGeo, mats.trunk, x, 0.6, z, 1, 1, 1, 0, false);
    addMesh(treeGeo, mats.pine, x, 3.1, z, 0.9 + hash01(i) * 0.5, 1, 0.9 + hash01(i + 2) * 0.4, 0, quality === "high");
    colliders.push(aabb(x, z, 1.1, 1.1, 0, 4));
    if (i % 4 === 0) cover.push({ x: x + 1.4, z: z + 1.1 });
  }
  lootSpots.push({ x: -64, z: 50, indoor: false });
  lootSpots.push({ x: -42, z: 66, indoor: false });

  // ---- THE FLATS cover ----
  for (let i = 0; i < 14; i++) {
    const x = -10 + hash01(i * 11.2) * 44;
    const z = -8 + hash01(i * 5.5) * 42;
    addProp(x, z, 1.6 + hash01(i) * 1.4, 0.9 + hash01(i + 1) * 0.8, 1.4 + hash01(i + 3) * 1.2, mats.rock);
  }
  addProp(8, 6, 2.8, 1.3, 1.4, mats.crate);
  addProp(18, 16, 1.6, 1.1, 3.2, mats.dark);
  addProp(-6, 18, 2.2, 1.4, 2.2, mats.rock);
  lootSpots.push({ x: 6, z: 8, indoor: false });
  lootSpots.push({ x: 20, z: 4, indoor: false });
  lootSpots.push({ x: -4, z: 12, indoor: false });

  // ---- OVERLOOK tower ----
  addBuilding(-18, 74, 8, 8, 5, mats.warehouse, mats.metal, "s");
  addColliderMesh(-18, 8, 74, 2.2, 6, 2.2, mats.dark);
  addMesh(boxGeo, mats.metal, -18, 11.4, 74, 5, 0.3, 5);
  lootSpots.push({ x: -18, z: 70, indoor: false });
  lootSpots.push({ x: -8, z: 68, indoor: false });

  // ---- CROSSROADS shops ----
  addBuilding(-14, -16, 10, 8, 4, mats.town, mats.roof, "n");
  addBuilding(16, -18, 12, 8, 4.4, mats.warehouse, mats.metal, "w");
  addBuilding(4, -28, 8, 8, 3.6, mats.town, mats.roof, "s");
  addProp(-4, -8, 1.8, 1.2, 4.4, mats.dark); // wrecked bus-like
  addProp(10, -6, 2.2, 1.1, 1.4, mats.crate);

  // Fence bits
  for (let i = 0; i < 8; i++) {
    addProp(-80 + i * 6, -78, 5.5, 1.3, 0.2, mats.metal);
  }

  // Extra scattered crates / barrels
  for (let i = 0; i < 22; i++) {
    const x = -90 + hash01(i * 19.1) * 180;
    const z = -90 + hash01(i * 13.7) * 180;
    if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
    addProp(x, z, 0.9, 1.05, 0.9, i % 2 ? mats.crate : mats.rust);
    if (i % 3 === 0) lootSpots.push({ x: x + 1.5, z, indoor: false });
  }

  // Map boundary walls (invisible-ish dark)
  addColliderMesh(0, 4, -100.4, 204, 8, 1.2, mats.dark);
  addColliderMesh(0, 4, 100.4, 204, 8, 1.2, mats.dark);
  addColliderMesh(-100.4, 4, 0, 1.2, 8, 204, mats.dark);
  addColliderMesh(100.4, 4, 0, 1.2, 8, 204, mats.dark);

  // Spawns around the map, away from exact center
  const spawnRing = [
    [-72, -72], [-20, -80], [30, -78], [78, -70],
    [80, -20], [78, 30], [70, 78], [20, 82],
    [-30, 80], [-78, 70], [-82, 10], [-80, -30],
    [-40, -10], [40, 10], [12, -50], [-10, 40],
    [60, -10], [-60, 10],
  ];
  for (const [x, z] of spawnRing) spawns.push({ x, z });

  const pois = [
    { name: "Old Town", x: -55, z: -48 },
    { name: "Ironworks", x: 55, z: -50 },
    { name: "Pine Hollow", x: -58, z: 54 },
    { name: "The Flats", x: 10, z: 10 },
    { name: "Drydock", x: 58, z: 52 },
    { name: "Overlook", x: -12, z: 70 },
    { name: "Crossroads", x: 0, z: -16 },
  ];

  extraLootAroundPois(pois, lootSpots);

  const groundY = (x: number, z: number) => {
    // Hill plateau
    if (x > -28 && x < 4 && z > 58 && z < 86) return 4.8;
    if (x > -19 && x < -5 && z > 51 && z < 61) return 2.4;
    if (x > -17 && x < -7 && z > 44 && z < 52) return 1.0;
    return 0;
  };

  return { group, colliders, cover, lootSpots, spawns, pois, groundY };
}

function extraLootAroundPois(
  pois: { x: number; z: number }[],
  lootSpots: LootSpot[],
) {
  for (const p of pois) {
    lootSpots.push({ x: p.x + 4, z: p.z + 3, indoor: false });
    lootSpots.push({ x: p.x - 3, z: p.z + 2, indoor: false });
  }
}
