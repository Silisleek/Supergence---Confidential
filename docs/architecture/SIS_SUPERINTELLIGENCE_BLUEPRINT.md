# SIS 1.0 Superintelligence & Autonomous Coding Architecture Blueprint

**Target:** SIS (Super Intelligent System 1.0)  
**Author:** AI Systems Research & Engineering  
**Scope:** Continuous Learning, Superhuman Coding, Execution Sandboxes, Trajectory Harvesting, and Systematic Search

---

## 1. Harsh Reality: Why Current Agent "Self-Improvement" Fails

### 1.1 The Bio-Mimetic Naming Illusion

SIS currently features modules named after neuroscience structures:

- `glymphatic.js` (cleaning context arrays)
- `dmn-daemon.js` (background prompt loops)
- `thalamus` & `neuromodulators` (prompt headers and score multipliers)

**The Harsh Truth:** Prompting an LLM that it is a "thalamocortical filter" or running a background timer that trims JSON objects does not produce learning. LLM weights are static inference engines. Unless gradients are updated or dynamic in-context programs are synthesized against verifiable rewards, the model repeats the exact same probability distribution.

When an architecture chains 28+ unverified personas together, the probability of failure compounds exponentially:
$$P(\text{Success}) = \prod_{i=1}^{n} P(\text{Step } i)$$
If each sub-agent is 92% accurate, a 10-step chain yields an overall accuracy of only ~43.4%.

### 1.2 The Self-Evaluation Trap

In `server/improvement/empirical-gym.js`, the system asks an LLM to generate its own benchmarks and evaluate its own code.

- LLMs are inherently sycophantic to their own outputs.
- A model will consistently generate tests that match its own edge-case blind spots.
- **Rule:** Never allow an LLM to be the sole judge of its own generated code. Benchmarks must come from deterministic compilers, typecheckers, invariant suites, and external ground-truth test matrices.

---

## 2. Real Continuous Learning in Autonomous Agents

True continuous learning operates across three distinct timescales:

### 2.1 RLVR & DPO Trajectory Harvesting (Long-Term Weight Adaptation)

Every execution in the empirical gym must log a structured trajectory $\tau$:
$$\tau = (s_0, a_0, r_0, s_1, a_1, r_1, \dots)$$

- Log all observations, thoughts, tool invocations, compiler errors, and final outputs into an append-only JSONL format (`data/trajectories/`).
- Partition trajectories into winning runs ($\tau_w$) and losing runs ($\tau_l$) using **Reinforcement Learning via Verifiable Rewards (RLVR)**:
  - Exit code == 0 (Pass)
  - Unit tests passed (100%)
  - Memory consumption within bounds
  - Latency profile below threshold
- Use these paired trajectories to fine-tune open-weight models (DeepSeek-Coder, Qwen-2.5-Coder) via Direct Preference Optimization (DPO):
  $$\mathcal{L}_{\text{DPO}}(\pi_\theta; \pi_{\text{ref}}) = -\mathbb{E}_{(\tau_w, \tau_l) \sim \mathcal{D}} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(\tau_w)}{\pi_{\text{ref}}(\tau_w)} - \beta \log \frac{\pi_\theta(\tau_l)}{\pi_{\text{ref}}(\tau_l)} \right) \right]$$

### 2.2 Dynamic Hierarchical Memory (Procedural vs. Episodic)

- **Procedural Memory (AST Call-Graph):** Use Tree-sitter to parse the codebase into an explicit directed graph of symbols, imports, caller-callee relationships, and type signatures.
- **Episodic Memory (Hierarchical GraphRAG):** Instead of scanning flat JSON arrays, cluster prior debugging episodes by problem archetype, retrieving exact historical bug-fix trajectories when matching failure signatures recur.

### 2.3 Meta-Prompt Optimization (DSPy / MIPROv2)

Stop manually editing Markdown prompt files.

- Treat prompts as parameterized functions.
- Run automated prompt optimizers (MIPROv2 style) that analyze pass/fail execution traces and programmatically evolve prompt instructions and few-shot exemplars over a Pareto frontier.

---

## 3. Superhuman Coding Architecture

What separates basic coding chatbots from top SWE agents (SWE-agent, Devin, Claude Code):

| Dimension           | Current SIS Pattern                          | Frontier Production Standard                                                                                 |
| :------------------ | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Execution**       | Windows `child_process.exec`                 | Hardened OCI Container / MicroVM (Docker, Firecracker)                                                       |
| **Code Navigation** | Regex string searches (`context-scanner.js`) | Language Server Protocol (LSP) — AST go-to-def, references, diagnostics                                      |
| **Editing Mode**    | Whole-file overwriting or markdown blocks    | Surgical unified diffs & exact search-replace with AST lint validation                                       |
| **Verification**    | Post-hoc LLM review                          | Strict Red-Green TDD Loop (Reproduce $\rightarrow$ Patch $\rightarrow$ Verify $\rightarrow$ Regression test) |
| **Search Space**    | Single greedy pass or random retry           | Beam Search / MCTS over trajectory branches with compiler backpropagation                                    |

### 3.1 Strict Test-Driven Development (TDD) Loop

```
1. Receive Task
   │
   ▼
2. Write Reproducing Test (test_repro.js)
   │
   ▼
3. Execute in Sandbox ──► Must FAIL (Red)
   │
   ▼
4. Generate Surgical Patch (Unified Diff)
   │
   ▼
5. Execute in Sandbox ──► Must PASS (Green)
   │
   ▼
6. Run Full Regression Suite ──► No Regressions
```

### 3.2 Language Server Protocol (LSP) Integration

Replace regex-based scanning with headless LSP servers (`vtsls`/`tsserver` for TS/JS, `pyright` for Python):

- `textDocument/definition`: Jump directly to symbol definitions across hundreds of files without grepping.
- `textDocument/references`: Find all usages across the project before refactoring or changing function signatures.
- `textDocument/publishDiagnostics`: Capture instant compiler type errors the moment a patch is applied.

---

## 4. Priority Implementation Roadmap

1. **Step 1: Containerized Execution Sandbox**
   - Deprecate raw `child_process.exec` on Windows host.
   - Run code inside pre-warmed Docker containers with strict cgroups (`512MB RAM`, `1 CPU`, `network: none`, `10s timeout`).
   - Use Git worktrees for instant clean rollback upon test failures.

2. **Step 2: Tree-sitter & LSP Engine**
   - Add `@tree-sitter/tree-sitter` and language grammars to Node.js.
   - Integrate an LSP client to provide exact symbol navigation and compiler diagnostics.
   - Replace full-file writes with surgical search-and-replace edits.

3. **Step 3: Trajectory Harvesting Pipeline**
   - Implement structured JSONL trajectory logging in `data/trajectories/`.
   - Log states, actions, compiler outputs, and deterministic reward signals for future model fine-tuning.

4. **Step 4: Decouple the Monolith into Task Workers**
   - Keep Express/WebSocket dedicated to the UI and streaming.
   - Offload heavy empirical gym benchmarks, AST parsing, and background loops to worker threads or a Redis/BullMQ task queue.

5. **Step 5: Beam Search & Programmatic Optimization**
   - Implement Beam Search ($k=3$) over execution paths.
   - Evaluate nodes via compiler feedback; prune syntax errors and dead branches early.
   - Systematically optimize prompt parameters based on empirical pass/fail benchmarks.
