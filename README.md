# DROPZONE

Browser-based battle royale shooter. Eighteen operators, one shrinking ring — loot the
sector, outgun the rest, and be the last signal on the net.

Built with **React 19 + TypeScript + Three.js + Tailwind CSS 4** on Vite. Everything runs
client-side: procedural Web Audio for SFX/music, generated world geometry, no assets to
download and no server required.

## Run it

```bash
npm install
npm run dev        # dev server
npm run build      # single-file production build in dist/
npm run preview    # serve the production build
npm run typecheck  # strict TypeScript check
```

## Controls

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Aim |
| LMB | Fire (auto / semi / burst per weapon) |
| RMB | Aim down sights |
| Shift | Sprint |
| Space | Jump |
| C | Crouch |
| R | Reload |
| E | Interact / pick up loot |
| 1 / 2 | Weapon slots |
| 3 / 4 / 5 | Stim / plate kit / adrenal surge |
| Tab | Inventory |
| M | Tactical map |
| Esc | Close overlay or pause |
| F3 / \` | Debug overlay |

## Features

- **Full BR loop** — drop selection, looting, a collapsing multi-phase storm ring,
  placement/results screen with damage and accuracy stats.
- **17 AI opponents** with four personalities (aggressive, defensive, balanced, looter),
  A* pathfinding over a nav grid, sight/hearing models, cover seeking, looting,
  third-partying, healing, and stuck recovery. They fight each other, not just you.
- **7 weapons × 4 rarity tiers**, typed ammo pools, armor with percentage absorption,
  stims/plates/adrenal surges, headshot multipliers.
- **Real ballistics feel** — hitscan tracers, spread cones that grow with movement and
  recoil, terrain (the central hill) blocks bullets and line of sight.
- **Hot drops** — guaranteed high-tier loot at each landmark for early fights.
- **Persistent records** — best placement, top kills, wins and match count saved locally.

## Project layout

```
src/
  game/     simulation: player, AI, world gen, zone, loot, FX, audio, input
  ui/       React overlays: menu, HUD, map, inventory, panels
  App.tsx   screen state machine bridging React UI <-> the game loop
```

Tuning knobs live in `src/game/config.ts` (weapons, rarities, AI personalities, zone
phases). Settings persist to `localStorage`.
