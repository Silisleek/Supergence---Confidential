function isTrustedApplicationUrl(value, { backendPort, vitePort, development }) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      (url.port === String(backendPort) || (development && url.port === String(vitePort))) &&
      ['/', '/index.html'].includes(url.pathname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

module.exports = { isTrustedApplicationUrl };
