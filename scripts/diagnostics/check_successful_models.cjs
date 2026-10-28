const { DatabaseSync } = require('node:sqlite');
const path = 'C:/Users/Akshan sharma/AppData/Roaming/FreeLLMAPI/freeapi.db';

const db = new DatabaseSync(path, { readOnly: true });
const rows = db
  .prepare(
    "SELECT platform, model_id, requested_model, served_model, status, latency_ms FROM requests WHERE status='success' ORDER BY id DESC LIMIT 20",
  )
  .all();
console.log('Successful rows count:', rows.length);
console.log(rows);
