# Rust migration

Supergence currently runs its backend in Node.js, its interface in a browser,
and its desktop wrapper in Electron. Replacing the backend with Rust is a
multi-stage migration, not a dependency update. Browser JavaScript and the
Electron wrapper require separate decisions; they do not become Rust when the
server is replaced.

No Rust implementation is included in this repository yet. Install a Rust
toolchain and select the target OS and integration boundary before starting an
implementation. Keep the Node application as the reference until each migrated
part has passed compatibility and acceptance tests.

## Establish the contract

1. Inventory the HTTP routes, WebSocket messages, tool operations, and persisted
   formats actually used by the main app. `server/index.js`,
   `server/tools/registry.js`, and `client/scripts/` are starting points, not a
   stable specification. Record errors and streaming behavior as well as happy
   paths.
2. Add tests against the running Node server for the behaviors to migrate.
   Include concurrent chats, reconnects, failed tool calls, cancellation,
   storage compatibility, and workspace access. Avoid depending on private
   production data or a live provider in deterministic contract tests.
3. Decide whether Rust will run as a local service, an OS service, or an embedded
   library. Define process ownership, permissions, startup, updates, data
   directories, shutdown, and the supported operating systems before choosing
   platform-specific integrations.

## Suggested migration order

1. Introduce a Rust workspace in a separate directory and verify its toolchain,
   builds, tests, and formatting in CI for each supported target.
2. Implement an isolated, read-only service slice with a defined contract, then
   compare responses and failure behavior against the Node reference. Keep it
   opt-in until the app can exercise it through the normal interface.
3. Migrate persistence and conversation handling with fixture-based read/write
   compatibility tests, crash recovery, and a documented rollback strategy.
   Do not assume every existing subsystem honors `SIS_DATA_DIR`.
4. Migrate workspace and tool execution only after defining the OS security
   model. Test path traversal, links and platform-specific path rules, process
   permissions, output streaming, cancellation, and concurrent requests. The
   existing chat workspace is not an OS sandbox.
5. Port model gateway, streaming, orchestration, and remaining services in
   bounded slices. Exercise the main app and compare actual results against the
   existing behavior before switching each slice.
6. Replace or retain Electron as a separate decision. Verify lifecycle,
   permissions, packaging, and UI behavior on every supported OS.

## Acceptance criteria

- Relevant unit and contract tests pass for both implementations, including
  real failures and recovery; any intentionally changed behavior is documented.
- The main app passes its Chrome browser tests against the new backend.
- Existing user data can be read or safely migrated, and rollback is tested.
- The selected target OS has explicit process, storage, and privilege boundaries.
- Builds and tests run on the intended platforms. Performance claims are based
  on measurements of representative workloads, not the language choice alone.

The present server listens on all interfaces and exposes powerful workspace
operations. A Rust rewrite alone does not supply authentication, authorization,
or isolation. See [OS integration and handoff](os-integration.md).
