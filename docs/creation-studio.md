# Local creation studio

Open the app at the URL printed by `npm run server`, then use the composer tools menu → **Creation studio**.

Each project lives under `workspace/supergence/projects/<name>-<id>/` with `src/`, `assets/`, `renders/`, and `reports/`. The studio follows the active workspace, including `SIS_WORKSPACE_DIR`, and never clears existing projects. Shell and file tools can use the returned project directory. Runtime access settings still apply.

Tools available to Supergence:

- `get_creation_workspace`: actual paths, saved projects and assets, installed local capabilities.
- `create_workspace_project`: persistent project folders and a brief.
- `generate_texture`: wood, marble, brick, metal, fabric, noise, checker, grid, or rings. Saves PNG albedo, tangent-space normal and roughness maps. Size: 64–2048. Seed supports repeatable art. Optional color: `#RRGGBB`.
- `render_graphic`: converts custom self-contained SVG source into an editable SVG and PNG. Works without an image provider.
- `verify_workspace_artifact`: opens workspace HTML or an image in Chrome, records load/runtime errors, and saves a screenshot and JSON receipt. When the app is running it uses the workspace HTTP route so shared libraries and preview behavior match the app.

The assistant receives a build → run → inspect → repair workflow. A passing render report does not prove visual quality, interaction correctness, or task completion. These tools provide procedural materials and vector graphics; photographic generation still requires a suitable image model. They do not change model weights or guarantee general intelligence.

Verification:

```powershell
node --test tests/unit/creation-studio.test.mjs
$env:SIS_BASE_URL = 'http://localhost:<port-from-startup-banner>'
node tests/browser/creation-studio.mjs
```
