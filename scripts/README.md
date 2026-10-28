# Developer scripts

| Script                               | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `dev.mjs`                            | Start Express, detect its listening port, and start Vite with a matching proxy |
| `generate-icons.js`                  | Generate application branding assets                                           |
| `generate-skills.js`                 | Existing skill generation utility                                              |
| `installer-gui.ps1`                  | Windows installer UI                                                           |
| `maintenance/organize-workspace.mjs` | Preview legacy moves; `--apply` snapshots sources before moving files          |
| `build-unified-frontend.js`          | Generate the historical standalone frontend in `demos/legacy/`                 |

`build.mjs` stages scripts, Three.js assets, fonts, and images in `.cache/` before running Vite. Maintained sources stay in `client/`.

Historical diagnostics are grouped in `diagnostics/`, capture utilities in `capture/`, scene generators in `demos/generators/`, and manual live tests in `tests/manual/tools/`. Some use live models, local provider databases, fixed ports, or generated artifacts. Read them before use; they are not the default quality gate.

Run scripts from the workspace root unless a script documents another working directory. Save new diagnostic output under `test-results/`. Do not put credentials into scripts or commit local runtime state.
