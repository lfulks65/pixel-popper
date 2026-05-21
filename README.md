# Pixel Popper

A colorful, mobile-first arcade game built with Three.js and vanilla JavaScript. Guide falling particles to their matching color targets by rotating paddles and sliding gates!

## 🎮 How to Run

```bash
npm install
npm run dev
```

Open the dev server URL shown in the terminal (typically `http://localhost:5173`).

For production build:

```bash
npm run build
npm run preview
```

## 📱 Mobile Play

Pixel Popper is designed for portrait mode on mobile devices. The game:

- Detects orientation and shows a "Rotate your device" overlay in landscape
- Uses touch input — tap paddles to rotate them, tap gates to slide them
- Supports multi-touch for simultaneous paddle and gate control
- Disables zoom and scroll for a native-app feel

Best experienced on a phone held in portrait orientation.

## 🕹️ Gameplay

Particles fall from colored emitters at the top of the screen. Your goal is to guide them to matching collectors at the bottom:

1. **Tap/drag paddles** to redirect particle streams
2. **Tap/drag gates** to slide them open or shut, creating pathways
3. **Match colors** — particles collected in the wrong collector cost a life
4. **Complete levels** by filling all collectors to their target count before time runs out

Each level has increasing difficulty with more colors, obstacles, and tighter time limits.

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| **Three.js** | 3D rendering (WebGL) with instanced meshes for particles |
| **Vite** | Development server, bundling, hot module replacement |
| **Vanilla JS (ES modules)** | All game logic, no framework dependencies |
| **Web Audio API** | Procedural sound effects (no audio files needed) |
| **localStorage** | Persistent level unlocks and star ratings |

## 📁 Module Structure

```
src/
├── main.js              # Entry point — wires all systems together
├── Game.js              # Main game coordinator — state transitions, level lifecycle
├── Engine.js            # Game loop with fixed timestep, pause/resume, FPS tracking
├── Renderer.js          # Three.js WebGL renderer wrapper with perf optimizations
├── Scene.js             # Scene management and level element creation (paddles, walls, gates, collectors)
├── InputController.js   # Touch input with raycasting against scene elements
├── UIManager.js         # All UI overlays (loading, menu, HUD, win/fail, pause)
├── AudioManager.js      # Procedural sound effects via Web Audio API
├── AdManager.js         # Interstitial ad management
├── SaveManager.js       # Persistent save data via localStorage
├── LevelManager.js      # Level definitions, progression, star ratings
├── orientation.js       # Portrait/landscape detection and overlay
└── particles/
    ├── ParticleSystem.js   # Instanced mesh particle engine with collision
    └── ParticleEffects.js  # Visual effects layer (bursts, trails)
```

### Module Responsibilities

- **Engine** — Fixed timestep animation loop, game state machine (loading → menu → playing → paused → win/fail), FPS counter
- **Renderer** — WebGL renderer with capped pixel ratio, portrait-framed orthographic camera, resize handling, orientation detection
- **Scene** — Creates level elements (paddles, walls, gates, collectors) as Three.js meshes, manages scene lifecycle
- **Game** — Owns all system references, coordinates state transitions, handles particle collection logic, win/fail conditions
- **ParticleSystem** — GPU-efficient particle system using `InstancedMesh` with a pooled particle system, gravity physics, sphere/AABB collision
- **InputController** — Touch and mouse input with raycasting, paddle rotation, gate sliding, multi-touch support
- **UIManager** — HTML overlay management for all screens, CSS styling, HUD updates
- **LevelManager** — 10 handcrafted levels with increasing difficulty, star ratings, level progression
- **SaveManager** — Level unlock persistence, star ratings, game settings
- **AudioManager** — 6 procedural sound effects: collect, wrong color, level complete, level fail, click, lose life

## 🎯 Performance

- Particle rendering uses `InstancedMesh` — all particles drawn in a single draw call
- Pixel ratio capped at 2× for mobile performance
- Low-power GPU preference
- Particle pool reused instead of allocating new objects
- Antialiasing disabled to reduce fragment shader cost
- Fixed timestep ensures consistent physics regardless of frame rate

## 🚀 Development

```bash
# Run dev server with HMR
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 📝 Keyboard Shortcuts

- **P / Esc** — Pause/resume during gameplay
- **R** — Return to menu
