export function rateLimitDelay(error, fallback = 60000) {
  const headers = error?.headers;
  const value =
    typeof headers?.get === 'function' ? headers.get('retry-after') : headers?.['retry-after'];
  const seconds = Number(value);
  if (value != null && Number.isFinite(seconds) && seconds >= 0)
    return Math.max(1000, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date) && date > Date.now()) return date - Date.now();
  const match =
    /try again in\s+(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?/i.exec(
      String(error?.message || ''),
    );
  if (match) {
    const delay =
      (Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)) * 1000;
    if (delay > 0) return Math.max(1000, delay);
  }
  return fallback;
}
