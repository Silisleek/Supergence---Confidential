# Supergence launch review

**Current rollout is a private localhost preview for Windows x64.** Each tester runs their own copy on their PC. The public release gates below remain open.

## Local preview

1. Share the [portable executable](../release-candidate/2026-11-05-windows-x64/Supergence-Portable-1.0.0.exe) and its [SHA-256 manifest](../release-candidate/2026-11-05-windows-x64/release-manifest.json) privately with testers who already have Supergence activated on their Sleek accounts. The preview executable is unsigned. Use the portable build for this rollout while installer upgrade and uninstall acceptance is pending.
2. Run the executable and let it open its local workspace. The first portable start took about a minute on the test PC. Keep the listener on loopback and keep the private session URL on that PC.
3. Connect the already-activated Sleek account, then use the model setup screen to test a compatible OpenAI-style endpoint with native tool calling. Sleek sign-in uses the Internet. The model endpoint can run locally or be hosted, and web research contacts external sources.

The running portable candidate matched the manifest SHA-256. Its process tree listened only on `127.0.0.1` at port 3011 during this check. The local health endpoint returned HTTP 200, a request with a foreign Host header returned HTTP 403, and the Learning Library returned HTTP 401 without a session. The health probe against the PC's non-loopback address timed out. The port can vary between runs.

## Application and security checks

- Loopback request, session and origin checks cover HTTP and WebSocket entry points. Sleek authorization binds the loopback callback and one-time code to its PKCE proof. Account identity and activation must both be confirmed.
- Sign-out and session expiry cancel active work and pending approvals. On Windows, cancellation stops the running command's process tree. Recovery starts after authorized sign-in.
- Chat Markdown escapes raw markup and uses bundled DOMPurify. Browser tests exercised hostile markup and a second-turn edit with literal code in saved history. Local project previews are isolated from the workspace session.
- Provider setup requires a generation result and a native tool-call nonce. Saved provider keys are encrypted and stay bound to their configured endpoint. OpenCode requires explicit credentials and no longer imports the separate CLI's login.
- The main workspace, sign-in wizard, model setup, Learning Library, settings, file and artifact views, guide, and installer status page share the pastel palette. Chrome exercised all four settings choices, a 390px sign-in view, desktop and narrow Learning Library layouts, and the release hold.
- Lint and the production build passed. The unit suite passed 179 tests and skipped one Windows symlink test that needs local privileges. The npm dependency audit reported zero known advisories at the time of the check.

## Hands-on verification

- The real model generated a three-file tip calculator through the main workspace. The preview calculated 15 tip and 140 total for a bill of 125 at 12%. A second-turn revision split the total three ways at 46.67 per person and rejected zero and fractional party sizes. The initial revision failure was corrected and rerun.
- Seven source-backed studies in music, photography and SQL persisted across restart. The Learning Library recorded provenance, retrieved across topics, and scheduled spaced recall. The unreadable source remained visible. The SQL transfer record identifies its result as user-reported.
- A stopped task retained its Stopped state and recorded that pending research did not run.
- The user completed real Sleek sign-in in the earlier standalone Windows candidate. Windows inventory observed the workspace window title. A native-window binding error prevented independent inspection of the account payload. Later clean-profile packaging checks use a local identity fixture.

The learning changes retain and retrieve evidence across tasks. The verification sample measures these workflows and does not establish a general task-success rate or changes to model weights.

## Windows x64 candidate

The [release manifest](../release-candidate/2026-11-05-windows-x64/release-manifest.json) records SHA-256 hashes and Authenticode status for the 227,796,582-byte installer and 574,729,368-byte portable executable. Both are unsigned and remain private.

The packaged app passed fixture sign-in, native IPC, sandboxed preview, navigation boundary, restart and backup restoration. Its startup log showed OpenCode disabled. Each download contains the same 7,856 files as the tested application tree. The comparison excluded private runtime data and environment files.

The portable launcher started Electron after 58.2 seconds on this PC and reached the setup window in an isolated profile. The direct extraction format was selected for this candidate. The installer still needs clean Windows acceptance.

## Silisleek activation

Node and Flask share the 400-Neutrino debit, entitlement and unique receipt in one SQLite transaction. Updated workers require the explicit cutover flag before using the new store. Ten Python tests and seven Node tests passed. The staged production proxy preserved the same receipt across a restart. Concurrent requests to Node and Flask produced one debit. A mocked badge purchase kept its receipt and grant across a concurrent activation. Refund tests held the credits before the mocked gateway returned and preserved a concurrent Supergence activation. Pending gateway replies retained their reconciliation reference.

The production environment remains on its previous deployment. The mail credential found in source has been removed from both mail implementations. Its replacement must be set by the account owner before maintenance. A test with the previous configuration reached the live mail relay using an `example.invalid` recipient. A repeat with explicit blank credentials stopped before delivery.

## Public release gates

1. Run a clean Windows x64 installation, upgrade and uninstall-retention check in a disposable account or VM. This computer already has a machine-wide installation. Clean app profiles verify the runtime separately from installer behavior.
2. Rotate the exposed mail app password and verify the replacement through the service account. Validate badge and refund flows in the payment gateway sandboxes. The inspected service configuration supplies no sandbox keys.
3. Coordinate the production activation cutover with an administrator. Run the staging and production checks in the [rollout runbook](../../Silisleek/server/USER_STORE_ROLLOUT.md) with a disposable account, reviewed backups and explicit authorization before any production test debit.
4. Set the signing policy for direct Windows distribution before publishing the downloads.

Real microphone transcription and optional third-party integrations remain outside the verified acceptance sample.

## Clean Windows acceptance

Use a disposable Windows x64 VM or account with a known initial state. Run the exact installer from the release manifest and check its Start menu shortcut and first-run sign-in. In a separate checkpoint, create a fixture workspace and retained source with the previously supported build, then upgrade in place. Compare the conversation, file and source before and after. Uninstall, check that the data remains, and reinstall to verify recovery.

Local evidence is in `test-results/launch-windows-*.log`, `test-results/security-learning/`, `test-results/launch-manual/` and `test-results/launch-activation-regression.log`.
