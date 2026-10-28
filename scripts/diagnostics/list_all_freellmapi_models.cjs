const key = 'freellmapi-754571059bdea59e187b42ec3490649b04c6ca9dab422fe8';
(async () => {
  const res = await fetch('http://127.0.0.1:31415/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const ids = data.data.map((m) => m.id);
  console.log('Total models:', ids.length);
  const keywords = [
    'opus',
    'sonnet',
    'claude',
    '4.6',
    '4-6',
    '300m',
    'supergence',
    'default',
    'auto',
  ];
  keywords.forEach((kw) => {
    const matched = ids.filter((id) => id.toLowerCase().includes(kw));
    console.log(`Matched '${kw}':`, matched);
  });
})();
