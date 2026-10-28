import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.env.APPDATA, '9router/db/data.sqlite');
console.log('Opening:', dbPath);
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(
  'Tables:',
  tables.map((t) => t.name),
);

for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get();
    console.log(`- ${t.name}: ${count.c} rows`);
  } catch (_) {}
}
