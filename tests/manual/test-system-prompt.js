import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:20128/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function run() {
  console.log('Testing with system prompt:');
  const res1 = await client.chat.completions.create({
    model: 'opus-4.8-m',
    messages: [
      { role: 'system', content: 'You are an AI theorist. Output JSON only.' },
      { role: 'user', content: 'Say hello in JSON.' },
    ],
    max_tokens: 100,
  });
  console.log('With system:', JSON.stringify(res1.choices[0]?.message));

  console.log('Testing with user prompt only:');
  const res2 = await client.chat.completions.create({
    model: 'opus-4.8-m',
    messages: [
      { role: 'user', content: 'You are an AI theorist. Output JSON only.\nSay hello in JSON.' },
    ],
    max_tokens: 100,
  });
  console.log('User only:', JSON.stringify(res2.choices[0]?.message));
}

run();
