const { DatabaseSync } = require('node:sqlite');
const path = 'C:/Users/Akshan sharma/AppData/Roaming/FreeLLMAPI/freeapi.db';

const db = new DatabaseSync(path, { readOnly: true });
console.log('Settings:', db.prepare('SELECT * FROM settings').all());
console.log('Profiles:', db.prepare('SELECT * FROM profiles').all());
console.log('Client Profiles:', db.prepare('SELECT * FROM client_profiles').all());
console.log('Users:', db.prepare('SELECT * FROM users').all());
