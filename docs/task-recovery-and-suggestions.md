# Task recovery and proactive suggestions

Open the app at http://localhost:3009/. The bell next to the browser control opens suggestions and review settings.

## Completion and recovery

Action tasks receive a completion review against their original goal and observed tool results. If authorized work remains, the agent continues. Per-action checkpoints retain the original request ID, results and unfinished work. A disconnected browser follows the same request through the status endpoint instead of repeating it. Startup recovery resumes flagged unfinished requests; uncertain actions first require read-only inspection.

Full access permits ordinary enabled tool work and application source edits. Disabled capabilities and the existing destructive-action, credential, policy and external-connector reviews still apply. Stop cancels the task and prevents automatic recovery; an action already executing may finish.

Recovery is bounded: three transient retries and up to eight additional tool batches, with repeated no-progress batches stopped. An exhausted or blocked task is saved as unfinished rather than reported as complete. This is recovery infrastructure, not a guarantee that every model-generated task succeeds.

## Proactive suggestions

This installation is configured for Workspace, Desktop, Documents and Downloads, every 90 minutes. Settings support 60–120 minutes, pausing, selected folders, foreground context and desktop notifications. Checks run while the backend is running, yield to active chat tasks, and do not replay missed intervals in a burst.

The review collects bounded file metadata (names, sizes and modification times; up to 500 files per selected folder, three directory levels) and sends up to 100 recent observed records to the configured model. It skips hidden folders, common secret names, generated dependency/cache directories and links outside the selected roots. It does not read file contents. Optional activity context includes the foreground app/window title and recent interaction with Supergence; no screenshots or keystroke text are captured.

Recommendations must reference observed records. The inbox persists them and suppresses duplicates. **Use this prompt** fills the composer; sending it is the user's decision. Windows notifications use a static helper and a JSON payload, never executable text interpolated from filenames or model output. “Submitted” means the OS notification API accepted the request; OS quiet-mode settings can affect visibility.

## Verification

- Unit tests cover persisted recovery, uncertain actions, explicit cancellation, continuation exhaustion, Full access source edits, bounded metadata review, a simulated 90-minute clock, duplicate suppression and settings revocation.
- `tests/browser/task-recovery-proactive.mjs` uses real Chrome and the configured model. It interrupts the client stream after a real append, verifies the final file has exactly one matching line, checks the completion verdict, and tests Stop and suggestion-to-composer behavior.
- Browser evidence is saved in `test-results/task-recovery-proactive/`. A live folder review also submitted a Windows notification. Physical notification visibility is controlled by Windows and was not visually certified.
