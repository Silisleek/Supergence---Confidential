import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDirectory = path.join(root, '.cache', 'vite-public');
const classicScripts = [
  'reload-guard.js',
  'workspace-controller.js',
  'feature-catalog.js',
  'feature-actions.js',
  'continuous-dock.js',
  'telemetry-values.js',
  'workspace-shell.js',
  'creation-studio.js',
  'chat-artifacts.js',
  'workspace-result-summary.js',
  'workspace-learning.js',
  'workspace-evolution.js',
  'workspace-cockpit.js',
  'workspace-chat-files.js',
  'workspace-browser.js',
  'workspace-access.js',
  'workspace-task-status.js',
  'workspace-proactive.js',
  'workspace-agent-profiles.js',
  'workspace-sidechat.js',
  'workspace-styles-window.js',
  'workspace-polish.js',
  'voice-input.js',
  'supergence-motion.js',
  'supergence-icons.js',
  'silisleek.js',
];

// Stage generated copies in Vite's public directory. Classic controllers keep
// their native globals and loading order; maintained sources stay in client/.
await fs.mkdir(path.join(publicDirectory, 'scripts'), { recursive: true });
await fs.copyFile(path.join(root, 'client', 'Styles.md'), path.join(publicDirectory, 'Styles.md'));
for (const script of classicScripts) {
  await fs.copyFile(
    path.join(root, 'client', 'scripts', script),
    path.join(publicDirectory, 'scripts', script),
  );
}
for (const directory of ['fonts', 'images']) {
  await fs.cp(path.join(root, 'client', directory), path.join(publicDirectory, directory), {
    recursive: true,
  });
}
for (const directory of ['build', 'examples/jsm']) {
  await fs.cp(
    path.join(root, 'node_modules', 'three', directory),
    path.join(publicDirectory, 'vendor', 'three', directory),
    { recursive: true },
  );
}

const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
