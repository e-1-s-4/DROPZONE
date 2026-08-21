import * as THREE from "three";
import { WEAPONS } from "./config";

export interface SoldierRig {
  group: THREE.Group;
  head: THREE.Object3D;
  weaponMount: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  visor: THREE.Mesh;
}

const geoCache: Record<string, THREE.BufferGeometry> = {};
const matCache: Record<string, THREE.Material> = {};

function box(w: number, h: number, d: number) {
  const k = `b${w}_${h}_${d}`;
  if (!geoCache[k]) geoCache[k] = new THREE.BoxGeometry(w, h, d);
  return geoCache[k];
}

function mat(color: number, extras?: THREE.MeshStandardMaterialParameters) {
  const k = `m${color}_${extras?.emissive ?? 0}_${extras?.roughness ?? 0.7}_${extras?.metalness ?? 0.2}`;
  if (!matCache[k]) {
    matCache[k] = new THREE.MeshStandardMaterial({
      color,
      roughness: extras?.roughness ?? 0.72,
      metalness: extras?.metalness ?? 0.18,
      emissive: extras?.emissive ?? 0x000000,
      emissiveIntensity: extras?.emissiveIntensity ?? 1,
    });
  }
  return matCache[k] as THREE.MeshStandardMaterial;
}

export function createSoldier(opts: {
  body: number;
  accent: number;
  visor: number;
  isPlayer?: boolean;
}): SoldierRig {
  const g = new THREE.Group();
  const bodyMat = mat(opts.body);
  const accentMat = mat(opts.accent, { metalness: 0.35, roughness: 0.45 });
  const dark = mat(0x1a1d23, { roughness: 0.85 });
  const visorMat = mat(opts.visor, {
    emissive: opts.visor,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.2,
  });

  const pelvis = new THREE.Mesh(box(0.52, 0.22, 0.3), dark);
  pelvis.position.y = 0.78;
  pelvis.castShadow = true;
  g.add(pelvis);

  const torso = new THREE.Mesh(box(0.58, 0.62, 0.32), bodyMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  g.add(torso);

  const vest = new THREE.Mesh(box(0.62, 0.34, 0.36), accentMat);
  vest.position.y = 1.22;
  vest.castShadow = true;
  g.add(vest);

  const head = new THREE.Mesh(box(0.3, 0.3, 0.3), dark);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);

  const helm = new THREE.Mesh(box(0.34, 0.16, 0.36), bodyMat);
  helm.position.y = 1.74;
  g.add(helm);

  const visor = new THREE.Mesh(box(0.28, 0.1, 0.08), visorMat);
  visor.position.set(0, 1.62, 0.16);
  g.add(visor);

  const leftLeg = new THREE.Mesh(box(0.2, 0.68, 0.22), dark);
  leftLeg.position.set(-0.14, 0.34, 0);
  leftLeg.castShadow = true;
  g.add(leftLeg);

  const rightLeg = new THREE.Mesh(box(0.2, 0.68, 0.22), dark);
  rightLeg.position.set(0.14, 0.34, 0);
  rightLeg.castShadow = true;
  g.add(rightLeg);

  const leftArm = new THREE.Mesh(box(0.16, 0.56, 0.16), bodyMat);
  leftArm.position.set(-0.4, 1.14, 0.04);
  leftArm.castShadow = true;
  g.add(leftArm);

  const rightArm = new THREE.Mesh(box(0.16, 0.56, 0.16), bodyMat);
  rightArm.position.set(0.4, 1.14, 0.04);
  rightArm.castShadow = true;
  g.add(rightArm);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.22, 1.18, 0.38);
  g.add(weaponMount);

  if (opts.isPlayer) {
    const pack = new THREE.Mesh(box(0.36, 0.4, 0.16), accentMat);
    pack.position.set(0, 1.2, -0.24);
    g.add(pack);
  }

  return { group: g, head, weaponMount, leftLeg, rightLeg, leftArm, rightArm, visor };
}

export function createWeaponMesh(defId: string, rarityColor: number) {
  const def = WEAPONS[defId] ?? WEAPONS.keeper;
  const g = new THREE.Group();
  const body = mat(def.color, { metalness: 0.55, roughness: 0.4 });
  const acc = mat(rarityColor, { emissive: rarityColor, emissiveIntensity: 0.25 });
  const dark = mat(0x111111);

  const receiver = new THREE.Mesh(box(def.thickness * 1.6, 0.12, 0.28), body);
  g.add(receiver);

  const barrel = new THREE.Mesh(
    box(def.thickness, def.thickness, def.barrelLength),
    dark,
  );
  barrel.position.z = def.barrelLength * 0.5 + 0.08;
  g.add(barrel);

  const stock = new THREE.Mesh(box(0.06, 0.1, 0.28), body);
  stock.position.set(0, -0.02, -0.26);
  g.add(stock);

  const mag = new THREE.Mesh(box(0.06, 0.18, 0.1), acc);
  mag.position.set(0, -0.12, 0.02);
  g.add(mag);

  if (def.class === "sniper") {
    const scope = new THREE.Mesh(box(0.08, 0.08, 0.22), acc);
    scope.position.set(0, 0.1, 0.1);
    g.add(scope);
  }
  if (def.class === "shotgun") {
    const pump = new THREE.Mesh(box(0.08, 0.08, 0.22), acc);
    pump.position.set(0, -0.06, 0.22);
    g.add(pump);
  }
  if (def.class === "lmg") {
    const boxMag = new THREE.Mesh(box(0.16, 0.14, 0.22), acc);
    boxMag.position.set(0, -0.14, 0.02);
    g.add(boxMag);
  }

  g.rotation.x = 0.04;
  return g;
}

export function animateSoldier(
  rig: SoldierRig,
  speed: number,
  t: number,
  ads: boolean,
  pitch: number,
  shooting: number,
) {
  const swing = Math.min(1, speed / 8) * 0.42;
  const bob = Math.sin(t * 10) * swing;
  rig.leftLeg.rotation.x = bob;
  rig.rightLeg.rotation.x = -bob;
  const aim = ads ? -0.35 : -0.12;
  rig.leftArm.rotation.x = aim + pitch * 0.4;
  rig.rightArm.rotation.x = aim + pitch * 0.4 - shooting * 0.35;
  rig.weaponMount.rotation.x = pitch * 0.15 - shooting * 0.4;
  rig.head.rotation.x = pitch * 0.35;
}

export function createLootBeacon(color: number) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    metalness: 0.3,
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.55), m);
  crate.position.y = 0.22;
  g.add(crate);
  const light = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  light.position.y = 0.7;
  g.add(light);
  return g;
}
