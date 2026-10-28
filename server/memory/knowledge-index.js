import { DatabaseSync } from 'node:sqlite';

export function sparseVector(text) {
  const counts = new Map();
  const terms =
    String(text)
      .toLowerCase()
      .match(/[\p{L}\p{N}_+#.-]{2,}/gu) || [];
  for (const term of terms) {
    counts.set(`w:${term}`, (counts.get(`w:${term}`) || 0) + 1);
    if (term.length >= 4)
      for (let i = 0; i < term.length - 2; i++) {
        const key = `g:${term.slice(i, i + 3)}`;
        counts.set(key, (counts.get(key) || 0) + 0.2);
      }
  }
  let squared = 0;
  for (const value of counts.values()) squared += value * value;
  const norm = Math.sqrt(squared) || 1;
  return Object.fromEntries([...counts].map(([term, weight]) => [term, weight / norm]));
}

export function cosine(a, b) {
  let score = 0;
  for (const [term, weight] of Object.entries(a)) score += weight * (b[term] || 0);
  return score;
}

// A derived SQLite vector database. Canonical source JSON can rebuild it after any interruption.
export function persistKnowledgeIndex(filename, records, sourceId = null) {
  const db = new DatabaseSync(filename);
  try {
    db.exec(
      'PRAGMA secure_delete = ON; CREATE TABLE IF NOT EXISTS chunks (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, digest TEXT NOT NULL, vector TEXT NOT NULL); CREATE INDEX IF NOT EXISTS chunks_source ON chunks(source_id); BEGIN IMMEDIATE;',
    );
    if (sourceId) db.prepare('DELETE FROM chunks WHERE source_id = ?').run(sourceId);
    else db.exec('DELETE FROM chunks');
    const insert = db.prepare('INSERT INTO chunks VALUES (?, ?, ?, ?)');
    for (const record of records)
      if (!sourceId || record.id === sourceId)
        for (const chunk of record.chunks)
          insert.run(
            chunk.id,
            record.id,
            record.digest,
            JSON.stringify(sparseVector(`${record.title} ${chunk.text}`)),
          );
    db.exec('COMMIT');
    const rows = sourceId
      ? db.prepare('SELECT id, vector FROM chunks WHERE source_id = ?').all(sourceId)
      : db.prepare('SELECT id, vector FROM chunks').all();
    return {
      vectors: new Map(rows.map((row) => [row.id, JSON.parse(row.vector)])),
      count: db.prepare('SELECT count(*) AS count FROM chunks').get().count,
    };
  } finally {
    db.close();
  }
}
