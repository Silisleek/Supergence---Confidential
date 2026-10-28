import fs from 'fs';

const html = fs.readFileSync('client/index.html', 'utf8');
const inputs = html.match(/<input[^>]*id=['"][^'"]*['"][^>]*>/gi) || [];
console.log('Inputs:', inputs);

const textareas = html.match(/<textarea[^>]*id=['"][^'"]*['"][^>]*>/gi) || [];
console.log('Textareas:', textareas);

const sendBtns = html.match(/<button[^>]*id=['"][^'"]*(?:send|submit)[^'"]*['"][^>]*>/gi) || [];
console.log('Send buttons:', sendBtns);
