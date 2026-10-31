import net from 'node:net';

/**
 * Checks whether an IP address belongs to private, loopback, link-local,
 * cloud metadata, or reserved ranges.
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrReservedIP(ip) {
  if (!ip || typeof ip !== 'string') return true;

  const cleanIp = ip.replace(/^\[|\]$/g, '').trim().toLowerCase();
  const version = net.isIP(cleanIp);
  if (version === 0) return false;

  if (version === 4) {
    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [b0, b1] = parts;

    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // 10.0.0.0/8 (Private-Use RFC 1918)
    if (b0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (Link-Local & Cloud Metadata, e.g. 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12 (Private-Use RFC 1918: 172.16.0.0 – 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private-Use RFC 1918)
    if (b0 === 192 && b1 === 168) return true;
    // 100.64.0.0/10 (Shared Address Space / CGNAT & Cloud Metadata e.g. 100.100.100.200)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation)
    if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
    // 224.0.0.0/4 (Multicast)
    if (b0 >= 224 && b0 <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future Use, incl. 255.255.255.255)
    if (b0 >= 240) return true;

    return false;
  }

  if (version === 6) {
    // Unspecified :: and Loopback ::1
    if (cleanIp === '::' || cleanIp === '::1') return true;

    // IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (cleanIp.startsWith('::ffff:')) {
      const remainder = cleanIp.slice(7);
      if (remainder.includes('.')) {
        return isPrivateOrReservedIP(remainder);
      }
      const hexParts = remainder.split(':');
      if (hexParts.length === 2) {
        const high = parseInt(hexParts[0], 16);
        const low = parseInt(hexParts[1], 16);
        const v4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        return isPrivateOrReservedIP(v4);
      }
      return true;
    }

    // Unique Local Addresses (fc00::/7 -> fc00.. - fdff..)
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) return true;
    // Link-Local Unicast (fe80::/10 -> fe80.. - febf..)
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) return true;
    // Multicast (ff00::/8)
    if (cleanIp.startsWith('ff')) return true;

    return false;
  }

  return true;
}

/**
 * Validates that a URL is a safe public HTTP or HTTPS endpoint,
 * preventing Server-Side Request Forgery (SSRF) against loopback,
 * internal private subnets, cloud metadata services, and local networks.
 *
 * @param {string} rawUrl
 * @returns {URL}
 * @throws {Error} if the URL is invalid or targets a non-public/dangerous destination
 */
export function assertSafeExternalUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('SSRF Guard: A valid URL string is required.');
  }

  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`SSRF Guard: Malformed URL: ${trimmed}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`SSRF Guard: Disallowed URL protocol: ${parsed.protocol}`);
  }

  const rawHost = parsed.hostname.toLowerCase();
  const host = rawHost.replace(/^\[|\]$/g, '').trim();

  if (!host) {
    throw new Error('SSRF Guard: URL missing host.');
  }

  // Reject local and internal hostnames
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host === 'instance-data' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.metadata.google.internal')
  ) {
    throw new Error(`SSRF Guard: Blocked internal hostname: ${host}`);
  }

  // Reject IP literals if private, loopback, or metadata
  if (net.isIP(host)) {
    if (isPrivateOrReservedIP(host)) {
      throw new Error(`SSRF Guard: Blocked private or reserved IP destination: ${host}`);
    }
  }

  return parsed;
}

export function isSafeExternalUrl(rawUrl) {
  try {
    assertSafeExternalUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

export default {
  assertSafeExternalUrl,
  isSafeExternalUrl,
  isPrivateOrReservedIP,
};
