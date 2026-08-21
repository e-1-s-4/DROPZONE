import { useEffect, useRef, useState } from "react";
import { Game } from "./game/Game";
import type { GameState, HudSnapshot, SettingsData } from "./game/types";
import { DEFAULT_SETTINGS } from "./game/types";
import { Menu } from "./ui/Menu";
import { HUD, InventoryOverlay, MapOverlay } from "./ui/HUD";
import { DropSelect, LoadingScreen, PauseMenu, Results, SettingsPanel } from "./ui/Panels";
import { TIPS } from "./game/config";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>("menu");
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [menuPanel, setMenuPanel] = useState<"root" | "how" | "controls" | "credits">("root");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({ ...DEFAULT_SETTINGS });
  const [inv, setInv] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, {
      onHud: (s) => {
        setHud(s);
        setState(s.state);
      },
      onState: (s) => setState(s),
    });
    gameRef.current = game;
    setSettings({ ...game.settings.data });
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    const t = window.setTimeout(() => gameRef.current?.openDrop(), 1400);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Tab" && (state === "playing" || inv)) {
        e.preventDefault();
        setInv((v) => !v);
        setMapOpen(false);
      }
      if (e.code === "KeyM" && state === "playing") {
        setMapOpen((v) => !v);
        setInv(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, inv]);

  const applySettings = (s: SettingsData) => {
    setSettings(s);
    gameRef.current?.applySettings(s);
  };

  const play = () => {
    setMenuPanel("root");
    gameRef.current?.startLoading();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {state === "menu" && (
        <Menu
          panel={menuPanel}
          setPanel={setMenuPanel}
          onPlay={play}
          onSettings={() => setSettingsOpen(true)}
        />
      )}

      {state === "loading" && <LoadingScreen tip={tip} />}

      {state === "drop" && (
        <DropSelect
          onDrop={(x, z) => {
            gameRef.current?.beginMatch(x, z);
          }}
        />
      )}

      {(state === "playing" || state === "paused") && hud && <HUD hud={hud} />}

      {state === "playing" && settings.showFps && hud && !hud.debug && (
        <div className="absolute top-5 right-28 z-20 font-mono text-xs text-cyan-200/80 pointer-events-none">
          {Math.round(hud.fps)} FPS
        </div>
      )}

      {inv && hud && state === "playing" && (
        <InventoryOverlay hud={hud} onClose={() => setInv(false)} />
      )}

      {mapOpen && hud && state === "playing" && (
        <MapOverlay hud={hud} onClose={() => setMapOpen(false)} />
      )}

      {state === "paused" && !settingsOpen && (
        <PauseMenu
          onResume={() => gameRef.current?.resumePlay()}
          onSettings={() => setSettingsOpen(true)}
          onMenu={() => gameRef.current?.toMenu()}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          data={settings}
          onChange={applySettings}
          onBack={() => setSettingsOpen(false)}
        />
      )}

      {(state === "dead" || state === "victory") && hud && (
        <Results
          victory={state === "victory"}
          hud={hud}
          onRestart={() => gameRef.current?.startLoading()}
          onMenu={() => gameRef.current?.toMenu()}
        />
      )}
    </div>
  );
}
