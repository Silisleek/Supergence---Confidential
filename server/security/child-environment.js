const privateNames = new Set([
  'SIS_SESSION_SECRET',
  'SIS_MASTER_SECRET',
  'SIS_AUDIT_SIGNING_KEY',
  'API_KEY',
  'LOCAL_ROUTER_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENCODE_API_KEY',
  'OPENCODE_ORG_ID',
  'COMPOSIO_API_KEY',
  'GITHUB_TOKEN',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'AZURE_OPENAI_API_KEY',
]);

const SENSITIVE_KEY_PATTERN = /(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CREDENTIAL|AUTH(?:ORIZATION|ENTICATION)?$|_AUTH$|^AUTH_)/i;

export function childEnvironment(overrides = {}) {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...overrides }).filter(([key]) => {
      const upper = key.toUpperCase();
      if (privateNames.has(upper)) return false;
      if (SENSITIVE_KEY_PATTERN.test(upper)) return false;
      return true;
    }),
  );
}
