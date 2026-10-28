import { quickAI, callAI, DEFAULT_MODEL } from '../../../server/api/openrouter.js';

(async () => {
  console.log('Testing quickAI with DEFAULT_MODEL:', DEFAULT_MODEL);
  try {
    const res = await quickAI(
      'Write a 1-sentence welcome message for Supergence Enterprise.',
      'You are a professional enterprise AI assistant.',
    );
    console.log('SUCCESS Response:\n', res);
  } catch (err) {
    console.error('ERROR in quickAI:', err.message);
  }
})();
