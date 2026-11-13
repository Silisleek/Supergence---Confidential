import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { assertSafeExternalUrl, isPrivateOrReservedIP } from '../security/ssrf-guard.js';

export async function publicAddresses(hostname, resolve = lookup) {
  const host = hostname.replace(/^\[|\]$/g, '');
  const resolved = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await resolve(host, { all: true, verbatim: true });
  const addresses = resolved.map(({ address }) => {
    const canonical =
      isIP(address) === 6 ? new URL(`http://[${address}]`).hostname.slice(1, -1) : address;
    return { address: canonical, family: isIP(canonical) };
  });
  if (
    !addresses.length ||
    addresses.some(
      ({ address, family }) =>
        !family ||
        isPrivateOrReservedIP(address) ||
        (family === 6 && (!/^[23][0-9a-f]{3}:/.test(address) || /^2001:(db8|0):/.test(address))),
    )
  )
    throw new Error('Source resolves to a private or reserved address.');
  return addresses;
}

export async function fetchPublicSource(input, { resolve = lookup, maxBytes = 1024 * 1024 } = {}) {
  let url = assertSafeExternalUrl(input);
  for (let hop = 0; hop <= 3; hop++) {
    const addresses = await publicAddresses(url.hostname, resolve);
    const address = addresses.find((entry) => entry.family === 4) || addresses[0];
    const response = await new Promise((resolveResponse, reject) => {
      const transport = url.protocol === 'https:' ? https : http;
      const request = transport.get(
        url,
        {
          headers: {
            'User-Agent': 'Supergence/1.0 source-reader',
            Accept: 'text/html,text/plain,application/json;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
          lookup: (_host, options, callback) =>
            options.all
              ? callback(null, [address])
              : callback(null, address.address, address.family),
        },
        (incoming) => {
          const status = incoming.statusCode || 0;
          const location = incoming.headers.location;
          if (status >= 300 && status < 400 && location) {
            incoming.destroy();
            resolveResponse({ status, location });
            return;
          }
          const contentType = String(incoming.headers['content-type'] || '');
          if (contentType && !/^(text\/|application\/(json|xml|xhtml\+xml))/i.test(contentType)) {
            incoming.destroy();
            reject(new Error('Source is not a supported text document.'));
            return;
          }
          let bytes = 0;
          const parts = [];
          incoming.on('data', (part) => {
            bytes += part.length;
            if (bytes > maxBytes) {
              incoming.destroy(new Error('Source exceeds the bounded reading limit.'));
              return;
            }
            parts.push(part);
          });
          incoming.on('error', reject);
          incoming.on('end', () =>
            resolveResponse({
              status,
              contentType,
              content: Buffer.concat(parts).toString('utf8'),
              url: url.href,
            }),
          );
        },
      );
      request.on('error', reject);
    });
    if (!response.location) return response;
    if (hop === 3) throw new Error('Source redirected too many times.');
    url = assertSafeExternalUrl(new URL(response.location, url).href);
  }
}
