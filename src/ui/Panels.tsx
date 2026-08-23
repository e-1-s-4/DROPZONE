import type { HudSnapshot, SettingsData } from "../game/types";
import { MAP_SIZE } from "../game/config";
import type { RecordsData } from "../game/SettingsManager";

export function PauseMenu({
  onResume,
  onSettings,
  onMenu,
}: {
  onResume: () => void;
  onSettings: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center no-select">
      <div className="hud-panel p-8 w-80 space-y-3 text-center">
        <h2 className="font-display tracking-[0.4em] text-2xl text-cyan-300">PAUSED</h2>
        <button className="menu-btn w-full py-3 border border-white/15 bg-black/40" onClick={onResume}>
          Resume
        </button>
        <button className="menu-btn w-full py-3 border border-white/15 bg-black/40" onClick={onSettings}>
          Settings
        </button>
        <button className="menu-btn w-full py-3 border border-white/15 bg-black/40" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

export function Results({
  victory,
  hud,
  records,
  onRestart,
  onMenu,
}: {
  victory: boolean;
  hud: HudSnapshot;
  records?: RecordsData | null;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const acc = hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center no-select bg-black/70">
      <div className="hud-panel p-10 w-[420px] max-w-[92vw] text-center space-y-5">
        <div className="text-[10px] tracking-[0.5em] text-white/40">MATCH COMPLETE</div>
        <h2
          className="font-display text-4xl tracking-[0.25em]"
          style={{ color: victory ? "#2ee6c5" : "#f87171" }}
        >
          {victory ? "SECTOR SECURED" : "SIGNAL LOST"}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="PLACE" value={`#${hud.placement}`} />
          <Stat label="KILLS" value={`${hud.kills}`} />
          <Stat label="TIME" value={fmt(hud.survivalTime)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="DAMAGE" value={`${hud.damageDealt}`} />
          <Stat label="ACCURACY" value={`${acc}%`} />
          <Stat label="CAREER WINS" value={`${records?.wins ?? 0}`} />
        </div>
        <p className="text-white/60 text-sm">
          {victory
            ? "You are the last operator in Rusthaven."
            : `${hud.aliveCount} still breathing. Drop again.`}
        </p>
        <button
          className="menu-btn w-full py-3 bg-cyan-400 text-slate-950 border border-cyan-200"
          onClick={onRestart}
        >
          Drop Again
        </button>
        <button className="menu-btn w-full py-3 border border-white/15 bg-black/40" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/35 p-3">
      <div className="text-[10px] tracking-[0.3em] text-white/40">{label}</div>
      <div className="font-display text-2xl text-white">{value}</div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SettingsPanel({
  data,
  onChange,
  onBack,
  showFps,
}: {
  data: SettingsData;
  onChange: (s: SettingsData) => void;
  onBack: () => void;
  showFps?: boolean;
}) {
  void showFps;
  const set = (p: Partial<SettingsData>) => onChange({ ...data, ...p });
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 no-select">
      <div className="hud-panel p-8 w-[460px] max-w-[92vw] space-y-5">
        <div className="flex justify-between">
          <h2 className="font-display tracking-[0.3em] text-cyan-300">SETTINGS</h2>
          <button onClick={onBack} className="text-xs tracking-widest text-white/50">
            BACK
          </button>
        </div>
        <Slider
          label="Mouse Sensitivity"
          value={data.sensitivity}
          min={0.3}
          max={2.4}
          onChange={(v) => set({ sensitivity: v })}
        />
        <Slider label="Master Volume" value={data.master} min={0} max={1} onChange={(v) => set({ master: v })} />
        <Slider label="SFX Volume" value={data.sfx} min={0} max={1} onChange={(v) => set({ sfx: v })} />
        <Slider label="Music Volume" value={data.music} min={0} max={1} onChange={(v) => set({ music: v })} />
        <Slider label="Field of View" value={data.fov} min={55} max={90} onChange={(v) => set({ fov: v })} />
        <div className="flex justify-between items-center text-sm">
          <span className="tracking-widest text-white/70">GRAPHICS</span>
          <select
            className="bg-black/50 border border-white/15 px-2 py-1"
            value={data.quality}
            onChange={(e) => set({ quality: e.target.value as SettingsData["quality"] })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <label className="flex justify-between items-center text-sm tracking-widest text-white/70">
          SHOW FPS
          <input
            type="checkbox"
            checked={data.showFps}
            onChange={(e) => set({ showFps: e.target.checked })}
          />
        </label>
        <p className="text-xs text-white/40 leading-relaxed">
          Settings save automatically in this browser. F3 toggles the developer overlay.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <div className="flex justify-between tracking-widest text-white/70 mb-1">
        <span>{label}</span>
        <span className="text-cyan-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 100}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

export function DropSelect({
  onDrop,
}: {
  onDrop: (x: number, z: number) => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 no-select">
      <div className="hud-panel p-6 w-[560px] max-w-[94vw]">
        <h2 className="font-display tracking-[0.3em] text-cyan-300 mb-1">SELECT DROP</h2>
        <p className="text-sm text-white/60 mb-4">Click the sector map. High ground, town interiors, and warehouses all play differently.</p>
        <div
          className="relative w-full aspect-square max-h-[58vh] mx-auto cursor-crosshair border border-cyan-400/30 overflow-hidden"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width;
            const nz = (e.clientY - r.top) / r.height;
            const x = nx * MAP_SIZE - MAP_SIZE / 2;
            const z = nz * MAP_SIZE - MAP_SIZE / 2;
            onDrop(x, z);
          }}
        >
          <div className="absolute inset-0 bg-[#6b5a3e]" />
          <div className="absolute left-[8%] top-[12%] w-[28%] h-[32%] bg-[#c4a484]/70" />
          <div className="absolute right-[8%] top-[14%] w-[28%] h-[30%] bg-[#8a4a32]/70" />
          <div className="absolute left-[10%] bottom-[12%] w-[28%] h-[30%] bg-[#3f4f2a]/80" />
          <div className="absolute right-[8%] bottom-[12%] w-[30%] h-[30%] bg-[#4d5a66]/80" />
          <div className="absolute left-[38%] bottom-[8%] w-[18%] h-[16%] bg-[#7a7368]/90" />
          <div className="absolute left-[40%] top-[40%] w-[22%] h-[22%] bg-[#8a6b45]/80" />
          <div className="absolute left-0 top-[46%] w-full h-[4%] bg-[#3a3d42]/80" />
          <div className="absolute left-[48%] top-0 h-full w-[4%] bg-[#3a3d42]/80" />
          <img
            src="images/drop-map.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-overlay"
          />
          <div className="absolute inset-0 dz-grid opacity-50 pointer-events-none" />
          <Tag l="Old Town" x="18%" y="22%" />
          <Tag l="Ironworks" x="70%" y="24%" />
          <Tag l="Pine Hollow" x="20%" y="72%" />
          <Tag l="Drydock" x="74%" y="72%" />
          <Tag l="Overlook" x="42%" y="82%" />
          <Tag l="The Flats" x="54%" y="52%" />
        </div>
        <p className="text-[11px] tracking-widest text-white/40 mt-3 text-center">
          TIP — warehouses favor close-range kits. Flats belong to Longwatch.
        </p>
      </div>
    </div>
  );
}

function Tag({ l, x, y }: { l: string; x: string; y: string }) {
  return (
    <div
      className="absolute font-display text-[10px] tracking-widest text-cyan-100 bg-black/50 px-1.5 py-0.5 pointer-events-none"
      style={{ left: x, top: y }}
    >
      {l}
    </div>
  );
}

export function LoadingScreen({ tip }: { tip: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 no-select">
      <div className="text-center space-y-6">
        <div className="font-display tracking-[0.5em] text-cyan-300 text-xl">DEPLOYING</div>
        <div className="w-64 h-1 bar-track mx-auto relative overflow-hidden">
          <div
            className="h-full bg-cyan-400 w-1/4"
            style={{ animation: "load-slide 1.1s ease-in-out infinite" }}
          />
        </div>
        <p className="text-white/60 text-sm max-w-md px-6">{tip}</p>
      </div>
    </div>
  );
}
