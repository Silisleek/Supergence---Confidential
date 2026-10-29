const privateNames = new Set([
  'SIS_SESSION_SECRET',
  'SIS_MASTER_SECRET',
  'SIS_AUDIT_SIGNING_KEY',
  'API_KEY',
  'LOCAL_ROUTER_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENCODE_API_KEY',
  'COMPOSIO_API_KEY',
  'GITHUB_TOKEN',
]);

export function childEnvironment(overrides = {}) {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...overrides }).filter(
      ([key]) => !privateNames.has(key.toUpperCase()),
    ),
  );
}
