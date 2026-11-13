import { cosine } from './knowledge-index.js';

export function bm25(terms, document, frequencies, count, averageLength) {
  const length = [...document.values()].reduce((sum, frequency) => sum + frequency, 0);
  return terms.reduce((score, term) => {
    const frequency = document.get(term) || 0;
    if (!frequency) return score;
    const documentFrequency = frequencies.get(term) || 0;
    const inverseFrequency = Math.log(
      1 + (count - documentFrequency + 0.5) / (documentFrequency + 0.5),
    );
    return (
      score +
      (inverseFrequency * (frequency * 2.2)) /
        (frequency + 1.2 * (0.25 + (0.75 * length) / Math.max(1, averageLength)))
    );
  }, 0);
}

export function diverseRanking(ranked, scoreFor, limit) {
  const pool = ranked.slice(0, 60);
  const selected = [];
  const maximum = Math.max(...pool.map(scoreFor), 1e-9);
  const seen = new Set();
  while (pool.length && selected.length < limit) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    pool.forEach((item, index) => {
      const redundancy = selected.reduce(
        (value, prior) => Math.max(value, cosine(item.entry.vector, prior.entry.vector)),
        0,
      );
      const score = (0.8 * scoreFor(item)) / maximum - 0.2 * redundancy;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    const [next] = pool.splice(bestIndex, 1);
    const text = next.entry.chunk.text.trim().replace(/\s+/g, ' ');
    if (seen.has(text)) continue;
    seen.add(text);
    selected.push(next);
  }
  return selected;
}
