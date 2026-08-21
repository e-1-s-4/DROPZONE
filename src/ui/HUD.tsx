import { useEffect, useRef } from "react";
import type { HudSnapshot } from "../game/types";
import { MAP_SIZE } from "../game/config";

export function HUD({ hud }: { hud: HudSnapshot }) {
  const mapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = mapRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawMinimap(ctx, c.width, c.height, hud);
  }, [hud]);

  const hp = Math.max(0, hud.health / hud.maxHealth);
  const ar = hud.armorLevel > 0 ? Math.max(0, hud.armor / hud.maxArmor) : 0;
  const gap = 7 + hud.spread * 420;
  const rarityColor =
    hud.rarity === "apex"
      ? "#f59e0b"
      : hud.rarity === "superior"
        ? "#38bdf8"
        : hud.rarity === "refined"
          ? "#34d399"
          : "#cbd5e1";

  return (
    <div className="absolute inset-0 z-10 pointer-events-none no-select">
      {hud.hurtFlash > 0.05 && (
        <div className="hurt-vignette absolute inset-0" style={{ opacity: hud.hurtFlash }} />
      )}
      {!hud.inZone && <div className="storm-vignette absolute inset-0" style={{ opacity: 0.7 }} />}

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 crosshair" style={{ transform: "translate(-50%, -50%)" }}>
        <div className="absolute bg-white/90" style={{ width: 2, height: 10, left: -1, top: -gap - 10 }} />
        <div className="absolute bg-white/90" style={{ width: 2, height: 10, left: -1, top: gap }} />
        <div className="absolute bg-white/90" style={{ width: 10, height: 2, top: -1, left: -gap - 10 }} />
        <div className="absolute bg-white/90" style={{ width: 10, height: 2, top: -1, left: gap }} />
        <div className="absolute w-[3px] h-[3px] bg-cyan-300 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      {hud.hitMarker > 0.05 && (
        <div
          className="absolute left-1/2 top-1/2 font-display text-xl"
          style={{
            color: hud.headMarker ? "#fbbf24" : "#ffffff",
            opacity: hud.hitMarker,
            transform: "translate(-50%, -50%)",
          }}
        >
          ✕
        </div>
      )}

      {/* Top status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-6 hud-panel px-5 py-2">
        <div className="text-center">
          <div className="text-[10px] tracking-[0.3em] text-white/40">ALIVE</div>
          <div className="font-display text-2xl text-cyan-300 leading-none">{hud.aliveCount}</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center min-w-[140px]">
          <div className="text-[10px] tracking-[0.3em] text-white/40">
            {hud.shrinking ? "COLLAPSING" : "NEXT RING"}
          </div>
          <div className={`font-display text-xl leading-none ${hud.inZone ? "text-white" : "text-red-400"}`}>
            {fmtTime(hud.zoneCountdown)} · {hud.zoneLabel}
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <div className="text-[10px] tracking-[0.3em] text-white/40">KILLS</div>
          <div className="font-display text-2xl text-amber-400 leading-none">{hud.kills}</div>
        </div>
      </div>

      <div className="absolute top-4 right-4 font-display text-sm tracking-widest text-white/50">
        {fmtTime(hud.matchTime)}
      </div>

      {/* Kill feed */}
      <div className="absolute top-20 left-4 space-y-1 w-72">
        {hud.killFeed.map((k) => (
          <div
            key={k.id}
            className="text-xs bg-black/45 px-2 py-1 border-l-2 border-amber-400/80"
            style={{ animation: "feed-in 0.2s ease" }}
          >
            <span className="text-amber-300">{k.killer}</span>
            <span className="text-white/40"> ▸ </span>
            <span className="text-white/90">{k.victim}</span>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 space-y-1 text-center">
        {hud.notifications.map((n) => (
          <div key={n.id} className="font-display tracking-widest text-sm" style={{ color: n.color }}>
            {n.text}
          </div>
        ))}
      </div>

      {hud.prompt && (
        <div className="absolute left-1/2 bottom-36 -translate-x-1/2 hud-panel px-4 py-2 text-sm tracking-wider text-cyan-200">
          {hud.prompt}
        </div>
      )}

      {hud.usingItem && (
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 w-48">
          <div className="text-center text-xs tracking-widest text-white/70 mb-1">
            {hud.usingItem === "heal" ? "APPLYING STIM" : hud.usingItem === "kit" ? "PLATING" : "INJECTING"}
          </div>
          <div className="bar-track h-1.5">
            <div className="bar-fill bg-cyan-400" style={{ width: `${hud.useProgress * 100}%` }} />
          </div>
        </div>
      )}

      {hud.reloading && (
        <div className="absolute left-1/2 top-[62%] -translate-x-1/2 w-40">
          <div className="text-center text-[10px] tracking-[0.3em] text-amber-300 mb-1">RELOADING</div>
          <div className="bar-track h-1">
            <div className="bar-fill bg-amber-400" style={{ width: `${hud.reloadT * 100}%` }} />
          </div>
        </div>
      )}

      {!hud.inZone && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 font-display text-red-400 tracking-[0.4em] text-sm animate-pulse">
          STORM DAMAGE {hud.zoneDmg.toFixed(0)}/s · {Math.max(0, hud.zoneDist).toFixed(0)}m OUT
        </div>
      )}

      {/* Bottom left vitals */}
      <div className="absolute bottom-5 left-5 w-72 space-y-2">
        <div>
          <div className="flex justify-between text-[10px] tracking-[0.3em] text-white/50 mb-1">
            <span>ARMOR MK.{hud.armorLevel}</span>
            <span>{Math.round(hud.armor)}</span>
          </div>
          <div className="bar-track h-2">
            <div className="bar-fill bg-sky-400" style={{ width: `${ar * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] tracking-[0.3em] text-white/50 mb-1">
            <span>VITALS</span>
            <span>{Math.round(hud.health)}</span>
          </div>
          <div className="bar-track h-3">
            <div
              className="bar-fill"
              style={{
                width: `${hp * 100}%`,
                background: hp < 0.3 ? "#ef4444" : "#2ee6c5",
              }}
            />
          </div>
        </div>
        <div className="bar-track h-1">
          <div className="bar-fill bg-amber-200/70" style={{ width: `${hud.stamina}%` }} />
        </div>
        <div className="flex gap-2 text-[11px] tracking-widest text-white/60">
          <span>STIM {hud.heals}</span>
          <span>KIT {hud.kits}</span>
          <span>ADR {hud.boosts}</span>
        </div>
      </div>

      {/* Weapon */}
      <div className="absolute bottom-5 right-5 text-right hud-panel px-4 py-3 min-w-[200px]">
        <div className="text-[10px] tracking-[0.35em]" style={{ color: rarityColor }}>
          {hud.rarity ? hud.rarity.toUpperCase() : ""} {hud.weaponClass.toUpperCase()}
        </div>
        <div className="font-display text-2xl tracking-widest">{hud.weaponName}</div>
        <div className="text-3xl font-display leading-none">
          <span className={hud.ammo === 0 ? "text-red-400" : "text-white"}>{hud.ammo}</span>
          <span className="text-white/30 text-lg"> / {hud.mag}</span>
        </div>
        <div className="text-xs text-white/45 tracking-widest mt-1">
          RSV {hud.reserve} {hud.ammoType ?? ""}
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-5 md:bottom-36">
        <canvas
          ref={mapRef}
          width={180}
          height={180}
          className="rounded-sm border border-cyan-400/30 bg-black/50 shadow-lg"
        />
      </div>

      {hud.debug && (
        <div className="absolute top-20 right-4 text-[11px] font-mono text-lime-300/90 bg-black/50 p-2 space-y-0.5">
          {hud.debugLines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number, hud: HudSnapshot) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8,12,16,0.85)";
  ctx.fillRect(0, 0, w, h);
  const to = (x: number, z: number) => ({
    x: ((x + MAP_SIZE / 2) / MAP_SIZE) * w,
    y: ((z + MAP_SIZE / 2) / MAP_SIZE) * h,
  });
  ctx.strokeStyle = "rgba(46,230,197,0.85)";
  ctx.lineWidth = 2;
  const z = to(hud.zoneCx, hud.zoneCz);
  ctx.beginPath();
  ctx.arc(z.x, z.y, (hud.zoneR / MAP_SIZE) * w, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(240,160,32,0.7)";
  ctx.setLineDash([4, 3]);
  const n = to(hud.nextCx, hud.nextCz);
  ctx.beginPath();
  ctx.arc(n.x, n.y, (hud.nextR / MAP_SIZE) * w, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const e of hud.enemies) {
    if (!e.alive) continue;
    const p = to(e.x, e.z);
    ctx.fillStyle = "rgba(255,80,80,0.85)";
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  const p = to(hud.playerX, hud.playerZ);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(hud.playerYaw);
  ctx.fillStyle = "#2ee6c5";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 5);
  ctx.lineTo(0, 3);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function MapOverlay({
  hud,
  onClose,
}: {
  hud: HudSnapshot;
  onClose: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawMinimap(ctx, c.width, c.height, hud);
    const pois = [
      ["Old Town", -55, -48],
      ["Ironworks", 55, -50],
      ["Pine Hollow", -58, 54],
      ["The Flats", 10, 10],
      ["Drydock", 58, 52],
      ["Overlook", -12, 70],
    ] as const;
    ctx.font = "12px Rajdhani, sans-serif";
    ctx.fillStyle = "#9ff5e4";
    for (const [n, x, z] of pois) {
      const px = ((x + MAP_SIZE / 2) / MAP_SIZE) * c.width;
      const py = ((z + MAP_SIZE / 2) / MAP_SIZE) * c.height;
      ctx.fillText(n, px - 20, py);
    }
  }, [hud]);
  return (
    <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center pointer-events-auto no-select">
      <div className="hud-panel p-5">
        <div className="flex justify-between mb-3">
          <h2 className="font-display tracking-[0.3em] text-cyan-300">TACTICAL MAP</h2>
          <button onClick={onClose} className="text-xs tracking-widest text-white/50">
            M / ESC
          </button>
        </div>
        <canvas ref={ref} width={420} height={420} className="border border-cyan-400/30 bg-black/60" />
        <p className="text-[11px] text-white/40 mt-2 tracking-widest">CYAN = SAFE · AMBER = NEXT RING · YOU = ARROW</p>
      </div>
    </div>
  );
}

export function InventoryOverlay({
  hud,
  onClose,
}: {
  hud: HudSnapshot;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 bg-black/55 flex items-center justify-center pointer-events-auto no-select">
      <div className="hud-panel p-6 w-[540px] max-w-[92vw]">
        <div className="flex justify-between mb-4">
          <h2 className="font-display tracking-[0.3em] text-cyan-300">LOADOUT</h2>
          <button onClick={onClose} className="text-xs tracking-widest text-white/50">
            TAB / ESC
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {hud.slots.map((s, i) => (
            <div
              key={i}
              className={`p-3 border ${i === hud.activeSlot ? "border-cyan-400" : "border-white/10"} bg-black/30`}
            >
              <div className="text-[10px] tracking-widest text-white/40">SLOT {i + 1}</div>
              <div className="font-display text-lg">{s ? s.defId.toUpperCase() : "EMPTY"}</div>
              {s && (
                <div className="text-xs text-white/50">
                  {s.rarity} · {s.ammo} in mag
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs tracking-wider text-white/70">
          <div className="bg-black/30 p-2">LIGHT {hud.ammoCounts.light}</div>
          <div className="bg-black/30 p-2">HEAVY {hud.ammoCounts.heavy}</div>
          <div className="bg-black/30 p-2">SHELLS {hud.ammoCounts.shells}</div>
          <div className="bg-black/30 p-2">PREC {hud.ammoCounts.precision}</div>
        </div>
        <div className="mt-3 text-sm text-white/60">
          Stims {hud.heals} · Plate kits {hud.kits} · Adrenal {hud.boosts} · Armor Mk.{hud.armorLevel}
        </div>
      </div>
    </div>
  );
}
