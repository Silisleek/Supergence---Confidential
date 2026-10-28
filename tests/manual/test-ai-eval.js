import { quickAI, DEFAULT_MODEL } from '../../server/api/openrouter.js';

async function main() {
  console.log('Testing quickAI with DEFAULT_MODEL:', DEFAULT_MODEL);
  try {
    const res = await quickAI(
      'You are a test helper. Reply in JSON only: {"status": "ok"}',
      'Hello',
      DEFAULT_MODEL,
      100,
    );
    console.log('Response:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
