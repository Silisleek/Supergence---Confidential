# 05. Memory Tree & POSSAP Anticipatory Engine

SIS 1.0 incorporates a dual-tier memory system coupled with continuous predictive user intention modeling to minimize redundant reasoning and anticipate user needs before they are articulated.

---

## 1. Hierarchical Memory Architecture (`server/memory/`)

```
Memory Ingestion
      │
      ▼
[Short-Term Buffer]  ──(Sliding Context Window)──>  Conscious Streamer
      │
      ▼ (24/7 Background Verifier)
[Long-Term Tree]     ──(Hierarchical Branches)──>  Knowledge Graph
      │                                                   │
      ▼                                                   ▼
Episodes / Facts                              Semantic Concept Nodes
```

### A. Short-Term Memory (`short-term.js`)

- Manages immediate conversational turn context.
- Tracks transient entities, user preferences, and intermediate scratchpad variables.
- Implements sliding window summarization to prevent context exhaustion.

### B. Long-Term Memory Tree (`long-term.js`)

- Stores permanent facts, validated scientific theories, and code architecture decisions.
- Organized as a multi-root hierarchical tree:
  - `ROOT / ARCHITECTURE / FRONTEND / COCKPIT`
  - `ROOT / THEORIES / QUANTUM / INVARIANTS`
  - `ROOT / USER_PREFERENCES / GRAPHICAL_UI`

### C. The 24/7 Background Verifier

- An autonomous background task that processes unverified short-term memories:
  1. Deduplicates semantic overlaps.
  2. Resolves factual contradictions against known ground truth.
  3. Formally promotes verified nodes into the long-term tree (`data/memory.json`).

### D. Interactive D3.js Tree Visualizer (`client/scripts/memory-viz.js`)

- Rendered on Tab 03 (`03 MEMORY TREE`).
- Features collapsible hierarchical SVG nodes, glowing connection links, depth filtering, and live node search.

---

## 2. POSSAP Anticipatory Protocol (`server/possap/index.js`)

**POSSAP** stands for **Predictive Opportunity & State Simulation Anticipatory Protocol**.

### Core Mechanism

1. **Trajectory Embedding**: Analyzes recent prompt sequences, tool executions, and file modifications to construct a dynamic user intent vector.
2. **Predictive State Machine**: Matches the intent vector against a library of interaction graphs (e.g., _Simulation Request $\to$ Code Inspection $\to$ Parameter Optimization $\to$ Fullscreen Capture_).
3. **Preemptive Preparation**:
   - Pre-loads relevant documentation.
   - Warms up specific 3D shader pipelines.
   - Dispatches subconscious agents to pre-evaluate potential questions.
4. **Telemetry Feedback**:
   - Broadcasts `possap_prediction` to the frontend cockpit over WebSocket.
   - Displays the anticipated next step and confidence level ($0\%$ to $100\%$) in the Welcome HUD Card and Idle Feed tab.
