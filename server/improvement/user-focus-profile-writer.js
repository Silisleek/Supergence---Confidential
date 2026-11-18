import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { workerData } from 'node:worker_threads';

const { profilePath, profile } = workerData;
const tempPath = `${profilePath}.${randomUUID()}.tmp`;
await mkdir(path.dirname(profilePath), { recursive: true });
try {
  await writeFile(tempPath, JSON.stringify(profile, null, 2), { encoding: 'utf8', flag: 'wx' });
  await rename(tempPath, profilePath);
} finally {
  await rm(tempPath, { force: true });
}
