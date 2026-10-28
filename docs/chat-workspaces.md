# Chat workspaces

Each chat uses a persistent local directory at `workspace/chats/<conversation-id>/`. Starting a task opens the existing Workspace panel immediately. Its Files, Terminal and Activity views follow the selected chat. The Files view also shows a compact terminal when commands run.

Relative agent file paths and an omitted command `cwd` resolve to that chat's directory through an async context. Concurrent chats do not change a shared global working directory. Explicit absolute paths continue to support work on existing projects. This is a default working directory, not an operating-system sandbox.

The workspace watches real filesystem changes, including files written by commands. Text and image previews, download links and retaining file contents are available in the existing Files panel. Selecting a different chat replaces the file tree and terminal history with that chat's state.

Commands publish their actual command line, working directory, stdout, stderr, exit code and elapsed time. Output arrives while the child process runs. Recent events are persisted under `data/chat-workspaces/` and replayed after reconnection. Histories and file previews are bounded; large output chunks are explicitly shortened, and dependency/cache internals are excluded from filesystem notifications. Download returns the complete selected file.

Workspace viewers reject traversal and directory links. Agent local-access tools retain their existing access controls. Commands execute with the app's normal host permissions and command safety checks.

Verification: `tests/unit/conversation-workspaces.test.mjs` exercises concurrent directories, real subprocess streaming, file watching, persistence and path checks. `tests/browser/chat-workspace-live.mjs` drives real Chrome and the configured provider, creates same-named files in two chats, observes output before exit, opens file previews and switches back to retained terminal history. Evidence is saved in `test-results/chat-workspace-live/`.
