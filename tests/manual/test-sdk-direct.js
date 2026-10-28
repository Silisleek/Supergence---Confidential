import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:20128/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function run() {
  const res = await client.chat.completions.create({
    model: 'opus-4.8-m',
    messages: [
      {
        role: 'user',
        content:
          'Provide a theory JSON with fields "title", "hypothesis", "mathematicalFormulation".',
      },
    ],
    max_tokens: 300,
  });
  console.log('CHOICES:', JSON.stringify(res.choices, null, 2));
}

run();
