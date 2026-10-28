const { DatabaseSync } = require('node:sqlite');
const path = 'C:/Users/Akshan sharma/AppData/Roaming/FreeLLMAPI/freeapi.db';

try {
  const db = new DatabaseSync(path, { readOnly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);

  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM "${t.name}" LIMIT 5`).all();
      console.log(`Table ${t.name}:`, rows);
    } catch (e) {
      console.log(`Table ${t.name} query error:`, e.message);
    }
  }
} catch (err) {
  console.error('Database error:', err.message);
}
