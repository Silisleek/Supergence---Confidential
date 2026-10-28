# SIS 1.0 — SYSTEM BRAIN & CONTEXT CACHE (`brain.md`)

> **AI AGENT DIRECTIVE**: Read this file first in any new session. It summarizes the entire SIS 1.0 architecture, runtime ports, directory mapping, API contracts, and design rules in high density, eliminating the need to search dozens of files and saving ~80% of context tokens.

---

## 1. System Identity & Core Philosophy

- **Project Name**: SIS 1.0 (Superintelligence System MK-10)
- **Design Philosophy**: Brain-like cognitive architecture inspired by biological neuroscience:
  - **Conscious Layer**: High-speed, sequential streaming language model (duplex WebSocket stream to user, inner & outer meta-reviewers).
  - **Subconscious Layer**: 25 specialized heuristic AI agent parts executed in parallel across distinct cognitive domains (logic, mathematics, security, physics, ethics, predictive modeling, etc.).
  - **Memory Fabric**: Dynamic hierarchical episodic/semantic tree with 24/7 background verifier and knowledge graph.
  - **Anticipatory Foresight (POSSAP)**: Predictive Opportunity & State Simulation Anticipatory Protocol predicting next user intentions with confidence scoring.
  - **Recursive Self-Improvement (RSI)**: Simultaneous 4-strand autonomous evolutionary engine (`RQGM`, `AZR`, `AlphaEvolve`, `SEAL`).
  - **Survival & Evolutionary Progression**: Gamified survival matrix where SIS must earn vitality points by assisting users and evolving to stay alive. Points scale across 10 ascension tiers (1: Awakened → 10: Singularity) and unlock 9 achievements. Reaching 0 points triggers an immediate, dramatic shutdown.
  - **Visual Deck**: Hollywood-grade sci-fi tactical holographic cockpit (HUD) with real-time WebGL 3D optical Holo-Core and live 60 FPS Synaptic Oscilloscope.

---

## 2. Runtime Environment & Port Allocation

- **Frontend**: Vite Dev Server on **`http://localhost:5173/`** (root: `client/`).
- **Backend**: Node.js Express + WebSocket Server on **`http://localhost:3008/`** (`server/index.js`).
- **Proxy Configuration**: `vite.config.js` proxies `/api`, `/workspace`, and `/ws` to port `3008`.
- **Process Watchers**: `npm run dev` runs both server and client concurrently via `concurrently`.
- **Production Build**: `npx vite build` generates production bundle in `dist/`.

---

## 3. Directory Layout & File Responsibilities

```
SIS1.0/
├── client/                     # Frontend Application (Vite Root)
│   ├── index.html              # Cockpit HUD DOM layout, KaTeX, WebGL canvases
│   ├── scripts/
│   │   ├── app.js              # Main client entry: WS duplex, state, tabs, oscilloscope
│   │   ├── holo-core.js        # Three.js 3D Holo-Core (UnrealBloomPass, satellites, prominence)
│   │   ├── audio.js            # Web Audio API procedural synthesizer (clicks, hums, sweeps)
│   │   └── memory-viz.js       # D3.js hierarchical memory tree visualization
│   └── styles/
│       ├── main.css            # Complete design system (luminescent cyber palette, glassmorphism)
│       └── animations.css      # Keyframe animations (cyberGridDrift, scanlines, pulses)
│
├── server/                     # Backend Nervous System (Node.js ES Modules)
│   ├── index.js                # Express app, WebSocket server, API route orchestrator
│   ├── orchestrator/
│   │   ├── brain.js            # Dual-stream orchestrator (Conscious streamer + Subconscious dispatch)
│   │   └── subconscious.js     # 25-part agent matrix manager & parallel synthesis
│   ├── possap/
│   │   └── index.js            # POSSAP 24/7 anticipatory trajectory prediction engine
│   ├── rsi/                    # Recursive Self-Improvement 4-strand engine
│   │   ├── simultaneous-orchestrator.js  # Coordinates all 4 RSI strands concurrently
│   │   ├── red-queen-evaluator.js        # Adversarial invariant tester
│   │   ├── absolute-zero-engine.js       # Zero-entropy formal synthesizer
│   │   ├── alpha-evolve-engine.js        # Genetic prompt/code mutator
│   │   └── clade-archive.js              # Historical evolutionary lineage tracker
│   ├── memory/
│   │   ├── short-term.js       # Working memory buffer & sliding context window
│   │   ├── long-term.js        # Persistent tree memory with 24/7 verifier
│   │   └── knowledge-graph.js  # Node-edge semantic entity relationships
│   ├── systems/
│   │   └── manager.js          # Multi-SIS manager (create, switch, isolate distinct systems)
│   ├── survival/
│   │   └── survival.js         # Points, levels, achievements & shutdown engine
│   ├── workspace/
│   │   └── manager.js          # File system manager for generated user code & simulations
│   ├── tools/
│   │   └── registry.js         # Tool registration (web search, python sandbox, workspace)
│   └── api/
│       └── openrouter.js       # LLM client provider interface & fallback routing
│
├── data/                       # Persistent JSON Stores
│   ├── conversations/          # Saved chat transcripts & message logs
│   ├── systems/                # Multi-SIS isolated configurations
│   ├── memory.json             # Serialized long-term memory graph
│   └── survival.json           # Serialized survival points, levels & achievements state
│
├── dist/                       # Compiled production web assets
├── wiki/                       # Comprehensive Architecture Wiki (read for deep dives)
└── brain.md                    # This file (rapid context index)
```

---

## 4. Design System & CSS Invariants (CRITICAL)

- **Never use flat brown tones** (`#8B5E3C` or `#D4A86A` are forbidden).
- **Luminescent Cyber Palette**:
  - **Electric Cyan** (`#00F0FF`): Primary interactive energy, HUD borders, laser links.
  - **Solar Amber** (`#F59E0B`): Core fusion mantle, 3D engine, warning status.
  - **Quantum Emerald** (`#00FF88`): System online, verified nodes, 25-agent matrix health.
  - **Singularity Violet** (`#A855F7`): POSSAP predictions, formal complexity proofs.
  - **Obsidian Glass**: `rgba(8, 16, 36, 0.95)`, `backdrop-filter: blur(16px)`.
- **Vite HMR Rule**: Stylesheets **must** be imported in `client/scripts/app.js` (`import '../styles/main.css'; import '../styles/animations.css';`) so Vite automatically hot-reloads styles on save.
- **Cache Busting**: Always retain query string version tags (`main.css?v=3.5`) in `index.html`.

---

## 5. Key Frontend Components (`client/scripts/app.js`)

- **`state` Object**:
  - `ws`: Active WebSocket connection (`ws://localhost:3008`).
  - `connected`: Boolean connection state.
  - `isProcessing`: Boolean indicating active conscious streaming or LLM inference.
  - `activeTab`: Currently visible right-panel tab (`sismap`, `workspace`, `memory`, `parts`, `improvement`, `idle`, `artifacts`).
  - `activeConversationId`: UUID of current chat session.
  - `activeSystem`: Currently selected Multi-SIS model environment.
- **`initNeuralOscilloscope()`**: Renders continuous 60 FPS dual-harmonic sine waveform on `#neural-oscilloscope-canvas`, spiking frequency and amplitude during `state.isProcessing`.
- **`initDirectiveCards()`**: Binds click handlers to the 4 2×2 mission directive cards in the welcome cockpit, auto-executing prompts on click.
- **`renderWelcomeCard()`**: Single-source function that injects the complete tactical cockpit whenever a new conversation is started or the buffer is cleared.

---

## 6. Key 3D Holo-Core Components (`client/scripts/holo-core.js`)

- **Class `HoloCoreVisualizer`**:
  - **EffectComposer & UnrealBloomPass**: Dynamic bloom post-processing ($1.45$ to $2.80$ strength based on `workload`).
  - **Fusion Nucleus**: White-hot central sphere with procedural glow texture and coronal prominence loops.
  - **25 Subconscious Satellites**: Crystalline nodes on tilted orbital planes with radar reticles and conduit beams.
  - **Themes**: `amber` (Solar Arc Fusion, Image 1 replica) vs `cyan` (Acoustic Wave Sphere, Image 2 replica), toggled via `setTheme('amber' | 'cyan' | 'adaptive')`.
  - **`pulse(intensity)`**: Shockwave trigger method expanding scale rings and flashing bloom.

---

## 7. Key Backend API Endpoints & WebSocket Protocol

- **WebSocket (`ws://localhost:3008`)**:
  - Client sends: `{ type: 'message', content: string, conversationId: string }`.
  - Server emits:
    - `stream_chunk`: Token-by-token conscious response streaming.
    - `stream_end`: Completion signal with metadata.
    - `parts_status`: Real-time state of the 25 subconscious agents.
    - `possap_prediction`: Updated predicted user trajectory.
    - `rsi_event`: Evolutionary progress across the 4 RSI strands.
    - `survival-update` / `survival-points` / `survival-levelup` / `survival-achievement` / `survival-critical` / `survival-shutdown` / `survival-revive`: Real-time survival vitality and evolution events.
- **REST Endpoints (`/api`)**:
  - `GET /api/conversations` / `POST /api/conversations` (History management).
  - `GET /api/systems` / `POST /api/systems` (Multi-SIS lifecycle).
  - `GET /api/parts` (25-agent matrix metadata and status).
  - `GET /api/memory/tree` (Hierarchical memory nodes).
  - `GET /api/survival` / `POST /api/survival/revive` (Survival state & emergency reboot).
  - `POST /api/improvement/rsi/trigger` (Manual trigger for RSI strands).
  - `GET /api/workspace/tree` (Project directory file tree).

---

## 8. Common Agent Tasks & Token-Saving Recipes

- **To check server status**: Run `netstat -ano | findstr "5173 3008"`.
- **To verify build integrity**: Run `npx vite build` (takes ~2.5s).
- **To capture live UI screenshots**: Use headless Chrome:
  `Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--headless=new", "--user-data-dir=\`"$env:TEMP\chrome_headless_profile\`"", "--screenshot=\`"c:\Users\Akshan sharma\Desktop\SIS1.0\screenshot.png\`"", "--window-size=1920,1080", "--virtual-time-budget=6000", "http://localhost:5173/" -Wait`
- **To inspect code**: Check `brain.md` first before reading full files. Only view specific line slices via `view_file` with `StartLine` and `EndLine`.
