import type { ReactNode } from "react";

type Panel = "root" | "how" | "controls" | "credits";

export function Menu(props: {
  panel: Panel;
  setPanel: (p: Panel) => void;
  onPlay: () => void;
  onSettings: () => void;
}) {
  const { panel, setPanel, onPlay, onSettings } = props;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden no-select pointer-events-none">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35 pointer-events-none"
        style={{ backgroundImage: "url(/images/menu-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20 pointer-events-none" />
      <div className="absolute inset-0 dz-grid opacity-30 pointer-events-none" />
      <div className="absolute -left-20 top-0 h-full w-2 bg-cyan-400/70 blur-[2px]" />

      <div className="relative h-full flex flex-col px-10 py-8 md:px-16 md:py-10 pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-display text-[11px] tracking-[0.45em] text-cyan-300/80">
              RUSTHAVEN SECTOR
            </span>
          </div>
          <span className="text-xs tracking-[0.3em] text-white/40 uppercase">Build 1.0 — Offline Ops</span>
        </div>

        <div className="mt-16 max-w-xl">
          <p className="text-cyan-300 tracking-[0.5em] text-xs mb-3">LAST ONE STANDING</p>
          <h1 className="font-display text-6xl md:text-8xl font-extrabold tracking-[0.18em] text-white drop-shadow-[0_0_24px_rgba(46,230,197,0.25)]">
            DROPZONE
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-md leading-relaxed">
            Eighteen operators. One shrinking ring. Loot the sector, outgun the rest, and be the last signal on the net.
          </p>
        </div>

        <div className="mt-10 w-full max-w-sm space-y-3">
          {panel === "root" && (
            <>
              <MenuBtn label="Play" onClick={onPlay} primary />
              <MenuBtn label="How to Play" onClick={() => setPanel("how")} />
              <MenuBtn label="Controls" onClick={() => setPanel("controls")} />
              <MenuBtn label="Settings" onClick={onSettings} />
              <MenuBtn label="Credits" onClick={() => setPanel("credits")} />
            </>
          )}
          {panel === "how" && (
            <InfoCard title="How to Play" onBack={() => setPanel("root")}>
              <p>You drop into Rusthaven with a sidearm and a death clock.</p>
              <p>Scavenge weapons, armor, and stims from buildings and the dead.</p>
              <p>A storm ring collapses through several phases. Stay inside or burn.</p>
              <p>Seventeen rival operators loot, rotate, and fight each other — not just you.</p>
              <p>Be the last combatant alive. Placement, kills, and survival time are recorded.</p>
            </InfoCard>
          )}
          {panel === "controls" && (
            <InfoCard title="Controls" onBack={() => setPanel("root")}>
              <Row k="WASD" v="Move" />
              <Row k="Mouse" v="Aim" />
              <Row k="LMB" v="Fire" />
              <Row k="RMB" v="Aim down sights" />
              <Row k="Shift" v="Sprint" />
              <Row k="Space" v="Jump" />
              <Row k="C" v="Crouch" />
              <Row k="R" v="Reload" />
              <Row k="E" v="Interact / loot" />
              <Row k="1 / 2" v="Weapon slots" />
              <Row k="3 / 4" v="Stim / Plate kit" />
              <Row k="Tab" v="Inventory" />
              <Row k="M" v="Map" />
              <Row k="Esc" v="Pause" />
              <Row k="F3" v="Debug overlay" />
            </InfoCard>
          )}
          {panel === "credits" && (
            <InfoCard title="Credits" onBack={() => setPanel("root")}>
              <p>DROPZONE is an original browser combat experience.</p>
              <p>No copyrighted characters, maps, audio, or branding from other titles are used.</p>
              <p>Rendering: WebGL via Three.js · Audio: procedural Web Audio · UI: React.</p>
              <p>Play locally with a modern desktop browser. No server required.</p>
            </InfoCard>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between text-[11px] tracking-[0.25em] text-white/35 uppercase">
          <span>Click Play — no setup, no accounts</span>
          <span>Desktop recommended</span>
        </div>
      </div>
    </div>
  );
}

function MenuBtn({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`menu-btn w-full px-5 py-3 text-left text-sm font-semibold corner-clip border ${
        primary
          ? "bg-cyan-400/90 text-slate-950 border-cyan-200 tracking-[0.28em]"
          : "bg-black/45 text-white/90 border-white/15 hover:border-cyan-300/60"
      }`}
    >
      {label}
    </button>
  );
}

function InfoCard({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="hud-panel p-5 space-y-3 text-sm text-white/80">
      <div className="flex items-center justify-between">
        <h2 className="font-display tracking-[0.25em] text-cyan-300">{title}</h2>
        <button onClick={onBack} className="text-xs tracking-widest text-white/50 hover:text-white">
          BACK
        </button>
      </div>
      <div className="space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1">
      <span className="font-display text-cyan-300 text-xs tracking-wider">{k}</span>
      <span className="text-white/70">{v}</span>
    </div>
  );
}
