/** Display only measured values. Zero is valid; missing data stays unavailable. */
export function formatCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value.toLocaleString('en-US')
    : 'Unavailable';
}

export function formatConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? `${(value * 100).toFixed(1)}%`
    : 'Unavailable';
}

/** Reject HTTP and application errors before a control can report success. */
export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const data = await response.json();
  if (data?.success === false || data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request was not successful');
  }
  return data;
}
