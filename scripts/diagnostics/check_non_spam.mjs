import fs from 'fs';

const conv = JSON.parse(fs.readFileSync('data/conversations/conv-ws-1792547721319.json', 'utf8'));
const nonSpam = conv.messages.filter((m) => !m.content.includes('Autonomous Exploration Pulse'));
console.log('Non-spam count:', nonSpam.length);
nonSpam.forEach((m, i) => console.log(i, m.role, m.content?.slice(0, 100)));
