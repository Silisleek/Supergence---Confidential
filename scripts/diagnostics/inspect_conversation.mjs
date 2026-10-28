import fs from 'fs';

const conv = JSON.parse(fs.readFileSync('data/conversations/conv-ws-1792547721319.json', 'utf8'));
console.log('Conversation ID:', conv.id);
console.log('Title:', conv.title);
console.log('Total Messages:', conv.messages?.length);

conv.messages?.forEach((m, idx) => {
  console.log(`\n=================== [MESSAGE ${idx}] Role: ${m.role} ===================`);
  console.log(m.content);
});
