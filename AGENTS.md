# Developer & Team Agreements

This document outlines the core principles and engineering practices for anyone working on Supergence.

---

## 1. The App Is What Matters Most

Supergence has two distinct surfaces in this repository:

| Surface          | Path                                        | Notes                                                                                 |
| :--------------- | :------------------------------------------ | :------------------------------------------------------------------------------------ |
| **The Main App** | `client/index.html` + `client/scripts/*.js` | **This is the actual product.** Served at `http://localhost:3009/` (or current port). |
| Standalone Demos | `demos/*.html` or root demos                | Standalone experiments used for prototyping only.                                     |

Whenever you build a UI feature, fix a bug, or add new capabilities, **always apply it to the main app**. Standalone demo pages are great for experimenting, but our users interact with the app in `client/index.html`.

Before building a new control or UI component, check what's already there. The bottom deck already contains working `VOICE`, `DICTATE`, and `CHAT` modules wired through `app.js` and `stark-hud.css`. Extend and improve existing components rather than building redundant duplicate widgets.

---

## 2. Verify with Real Browsers, Not Just Source Inspection

Code that looks right on paper doesn't always work in reality. We verify our features in real browser environments:

- Start the server using `npm run server` and note the port printed in the console.
- Run tests in real Chrome via Playwright (`npm run test:browser`).
- **Synchronize using actual state**: Don't use arbitrary fixed sleeps (e.g. `setTimeout(..., 2500)`). APIs like `AudioContext` and `getUserMedia` take time to spin up; poll for the expected state instead.
- **Be transparent about test limitations**: Headless Chrome with mock audio devices emits silence, so real-time speech transcription can't be headlessly simulated. Test callback paths directly and document what was tested.

---

## 3. Real Data Only — No Canned or Seeded Values

Honesty in telemetry and state is a foundational principle of Supergence:

- Never display synthetic `Math.random()` numbers for latency, system load, or metrics.
- Never show hardcoded fake log entries or dummy activity.
- If data is temporarily unavailable or disconnected, clearly show it as "Unavailable" or "Connecting" rather than displaying simulated figures.

_Note on endpoints_: The `GET /api/state` endpoint can return large payloads that block Node's event loop. For real-time updates, prefer lightweight dedicated endpoints like `/api/health`, `/api/brain/lifecycle`, `/api/survival`, and WebSocket events.

---

## 4. Code Cleanliness & Professionalism

- Write clean, expressive, self-documenting code.
- Avoid unnecessary commentary or noisy inline remarks between lines of code.
- Keep functions focused and well-typed where appropriate.
- Always run `npm run test:unit` and `npm run lint` before committing your changes.
