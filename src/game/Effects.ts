import * as THREE from "three";

interface Tracer {
  line: THREE.Line;
  life: number;
  used: boolean;
}

interface Spark {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  used: boolean;
}

interface Floater {
  sprite: THREE.Sprite;
  vy: number;
  life: number;
  used: boolean;
}

export class Effects {
  group = new THREE.Group();
  private tracers: Tracer[] = [];
  private sparks: Spark[] = [];
  private floaters: Floater[] = [];
  private flash: THREE.PointLight;
  private flashLife = 0;
  private impactGeo = new THREE.SphereGeometry(0.05, 5, 5);
  private impactMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
  private tracerMat = new THREE.LineBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.85,
  });
  private canvasCache = new Map<string, THREE.CanvasTexture>();
  private canvasCacheMax = 48;

  constructor() {
    this.flash = new THREE.PointLight(0xffcc88, 0, 8);
    this.group.add(this.flash);
    for (let i = 0; i < 24; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, 1),
      ]);
      const line = new THREE.Line(geo, this.tracerMat.clone());
      line.visible = false;
      this.group.add(line);
      this.tracers.push({ line, life: 0, used: false });
    }
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(this.impactGeo, this.impactMat);
      mesh.visible = false;
      this.group.add(mesh);
      this.sparks.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, used: false });
    }
  }

  muzzle(x: number, y: number, z: number) {
    this.flash.position.set(x, y, z);
    this.flash.intensity = 6;
    this.flashLife = 0.045;
  }

  tracer(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const t = this.tracers.find((v) => !v.used);
    if (!t) return;
    t.used = true;
    t.life = 0.07;
    const pos = t.line.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, ax, ay, az);
    pos.setXYZ(1, bx, by, bz);
    pos.needsUpdate = true;
    t.line.visible = true;
    (t.line.material as THREE.LineBasicMaterial).opacity = 0.9;
  }

  impact(x: number, y: number, z: number, count = 6) {
    let spawned = 0;
    for (const s of this.sparks) {
      if (s.used) continue;
      s.used = true;
      s.life = 0.25 + Math.random() * 0.15;
      s.mesh.position.set(x, y, z);
      s.mesh.visible = true;
      s.vx = (Math.random() - 0.5) * 6;
      s.vy = 2 + Math.random() * 4;
      s.vz = (Math.random() - 0.5) * 6;
      spawned++;
      if (spawned >= count) break;
    }
  }

  damageNumber(x: number, y: number, z: number, text: string, color: string) {
    const key = text + color;
    let tex = this.canvasCache.get(key);
    if (!tex) {
      // Evict the oldest entry when the cache grows too large
      if (this.canvasCache.size >= this.canvasCacheMax) {
        const oldest = this.canvasCache.keys().next().value as string | undefined;
        if (oldest != null) {
          this.canvasCache.get(oldest)?.dispose();
          this.canvasCache.delete(oldest);
        }
      }
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 64;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 128, 64);
      ctx.font = "bold 42px Rajdhani, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 6;
      ctx.strokeText(text, 64, 46);
      ctx.fillText(text, 64, 46);
      tex = new THREE.CanvasTexture(c);
      this.canvasCache.set(key, tex);
    }
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.4, 0.7, 1);
    this.group.add(sprite);
    this.floaters.push({ sprite, vy: 1.6, life: 0.7, used: true });
  }

  update(dt: number) {
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      this.flash.intensity = Math.max(0, this.flashLife * 120);
    }
    for (const t of this.tracers) {
      if (!t.used) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.used = false;
        t.line.visible = false;
      }
    }
    for (const s of this.sparks) {
      if (!s.used) continue;
      s.life -= dt;
      s.vy -= 12 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      if (s.life <= 0) {
        s.used = false;
        s.mesh.visible = false;
      }
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      (f.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, f.life / 0.7);
      if (f.life <= 0) {
        this.group.remove(f.sprite);
        (f.sprite.material as THREE.SpriteMaterial).dispose();
        this.floaters.splice(i, 1);
      }
    }
  }

  dispose() {
    this.group.clear();
  }
}
