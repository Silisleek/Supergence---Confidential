import fs from 'fs';

const content = fs.readFileSync(
  'C:/Users/Akshan sharma/.gemini/antigravity/brain/7c7fbd83-6c87-43b9-a9fc-d706f1060714/.system_generated/steps/13840/output.txt',
  'utf8',
);

function extractLastCodeFence(text) {
  const matches = [...text.matchAll(/```(?:javascript|js)?\s*\n([\s\S]*?)```/gi)];
  if (matches.length > 0) {
    return matches[matches.length - 1][1].trim();
  }
  return text.trim();
}

const finalCode = extractLastCodeFence(content);
console.log('Final code block length:', finalCode.length);
console.log('Final code block first 200 chars:\n', finalCode.slice(0, 200));
console.log('Final code block last 200 chars:\n', finalCode.slice(-200));
