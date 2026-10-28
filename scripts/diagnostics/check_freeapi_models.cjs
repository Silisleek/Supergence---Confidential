const { DatabaseSync } = require('node:sqlite');
const path = 'C:/Users/Akshan sharma/AppData/Roaming/FreeLLMAPI/freeapi.db';

const db = new DatabaseSync(path, { readOnly: true });
console.log('Columns:', db.prepare('PRAGMA table_info(models)').all());
const sample = db.prepare('SELECT * FROM models LIMIT 3').all();
console.log('Sample row:', sample);
