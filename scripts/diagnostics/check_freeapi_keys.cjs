const { DatabaseSync } = require('node:sqlite');
const path = 'C:/Users/Akshan sharma/AppData/Roaming/FreeLLMAPI/freeapi.db';

const db = new DatabaseSync(path, { readOnly: true });
const keys = db
  .prepare('SELECT id, platform, label, status, enabled, base_url, model_scope_json FROM api_keys')
  .all();
console.log('API Keys in FreeLLMAPI:');
console.log(keys);
