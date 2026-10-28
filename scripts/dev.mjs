import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let stopping = false;
let viteStarted = false;
let output = '';

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill();
}

function launch(args, options = {}) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', ...options });
  children.add(child);
  child.on('error', (error) => {
    console.error(`[dev] ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    stop(code ?? 1);
  });
  return child;
}

// Start Vite only when Express announces its actual listening port. This also
// works when Express falls back because another SIS instance occupies PORT.
const backend = launch(['server/index.js'], { stdio: ['inherit', 'pipe', 'inherit'] });
backend.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  output = (output + chunk.toString()).slice(-8192);
  const match = output.match(/Server running on http:\/\/localhost:(\d+)/);
  if (!match || viteStarted || stopping) return;
  viteStarted = true;
  console.log(`[dev] Connecting Vite to the backend on port ${match[1]}.`);
  launch(['node_modules/vite/bin/vite.js', '--host'], {
    env: { ...process.env, ACTIVE_SERVER_PORT: match[1] },
  });
});

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
