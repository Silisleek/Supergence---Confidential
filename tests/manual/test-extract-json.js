function sanitizeJSONBackslashes(str) {
  // Replace invalid escapes: any backslash not followed by " \ / b f n r t u
  return str.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
}

function extractCleanJSON(text) {
  if (!text) return null;
  let clean = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  clean = clean.replace(/```(?:json)?\r?\n([\s\S]*?)```/gi, '$1').trim();
  const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;

  const rawJSON = match[0];
  try {
    return JSON.parse(rawJSON);
  } catch {
    try {
      // 1. Try with sanitized LaTeX/unescaped backslashes
      const sanitized = sanitizeJSONBackslashes(rawJSON);
      return JSON.parse(sanitized);
    } catch {
      try {
        // 2. Try trailing commas cleanup + backslash sanitization
        const relaxed = sanitizeJSONBackslashes(rawJSON.replace(/,\s*([\}\]])/g, '$1'));
        return JSON.parse(relaxed);
      } catch (err) {
        return null;
      }
    }
  }
}

// Test with LaTeX backslashes: \mathcal, \sum, \frac
const llmRaw =
  '```json\n{\n  "title": "Quantum Metric",\n  "math": "\\mathcal{H} = \\frac{1}{2}\\sum_{i=1}^n x_i"\n}\n```';
console.log('Testing LLM output with LaTeX:');
const parsed = extractCleanJSON(llmRaw);
console.log('Parsed successfully?', !!parsed);
console.log('Parsed object:', parsed);
