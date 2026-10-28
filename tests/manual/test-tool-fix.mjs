import 'dotenv/config';
import toolRegistry from '../../server/tools/registry.js';
import OpenAI from 'openai';

async function test() {
  const tools = [...toolRegistry.getAll()]
    .filter((t) => !t.isDynamicSkill)
    .map((t) => {
      if (t.parameters && t.parameters.type === 'object' && t.parameters.properties) {
        return {
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: {
              type: 'object',
              properties: t.parameters.properties,
              required: Array.isArray(t.parameters.required)
                ? t.parameters.required
                : Array.isArray(t.required)
                  ? t.required
                  : [],
            },
          },
        };
      }

      const properties = {};
      const params = t.parameters || {};
      for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'string') {
          properties[k] = {
            type:
              v === 'array'
                ? 'array'
                : v === 'number'
                  ? 'number'
                  : v === 'boolean'
                    ? 'boolean'
                    : 'string',
            description: `${k} argument for ${t.name}`,
          };
          if (v === 'array') {
            properties[k].items = { type: 'string' };
          }
        } else if (v && typeof v === 'object') {
          properties[k] = v;
        }
      }

      return {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties,
            required: Array.isArray(t.required) ? t.required : [],
          },
        },
      };
    });

  console.log(`Formatted ${tools.length} tools`);

  const groq = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
  });
  try {
    const gRes = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: 'hey' }],
      tools: tools,
      max_tokens: 100,
    });
    console.log('GROQ SUCCESS WITH FORMATTED TOOLS:', gRes.choices[0].message);
  } catch (gErr) {
    console.error('Groq Error:', gErr.message, gErr.error);
  }

  const localClient = new OpenAI({
    baseURL: 'http://127.0.0.1:20128/v1',
    apiKey: process.env.LOCAL_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '',
  });
  try {
    const lRes = await localClient.chat.completions.create({
      model: 'for-supergence',
      messages: [{ role: 'user', content: 'hey' }],
      tools: tools,
      max_tokens: 100,
    });
    console.log(
      'LOCALROUTER FOR-SUPERGENCE SUCCESS WITH FORMATTED TOOLS:',
      lRes.choices[0].message,
    );
  } catch (lErr) {
    console.error('LocalRouter Error:', lErr.message, lErr.error);
  }
}

test()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
