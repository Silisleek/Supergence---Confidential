// SIS 1.0 — Cognitive Hybrid Search Engine (Vector Embeddings + BM25 + Reciprocal Rank Fusion)
// Provides zero-external-dependency, high-speed on-device semantic and lexical search.

export class HybridSearchEngine {
  constructor(options = {}) {
    this.k1 = options.k1 ?? 1.5; // BM25 term frequency saturation
    this.b = options.b ?? 0.75; // BM25 document length normalization
    this.rrfK = options.rrfK ?? 60; // Reciprocal Rank Fusion constant

    // Document index: id -> { doc, text, tokens, vector, length }
    this.documents = new Map();
    // Inverted index: term -> Set of docIds
    this.invertedIndex = new Map();
    // Document frequency: term -> count of docs containing term
    this.docFrequency = new Map();
    // Total tokens across all documents for O(1) avgDocLength
    this.totalTokens = 0;
    // Average document length in tokens
    this.avgDocLength = 0;
    // Total document count
    this.totalDocs = 0;

    // Vocabulary for dense vector space
    this.vocab = new Map(); // term -> index
    this.idfVector = [];
    this.isDirty = false;
  }

  /**
   * Tokenize text into words and subword character n-grams for semantic richness
   */
  tokenize(text) {
    if (!text) return [];
    // Cap text to avoid freeze on large AST or code blobs
    const boundedText = String(text).slice(0, 3000);
    const clean = boundedText.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ');
    const words = clean.split(/\s+/).filter((w) => w.length > 1 && w.length <= 30);
    const tokens = [];

    for (const w of words) {
      tokens.push(w);
      // Generate 3-gram character tokens for subword semantic matching (bounded)
      if (w.length >= 4 && w.length <= 15) {
        for (let i = 0; i <= Math.min(w.length - 3, 3); i++) {
          tokens.push(`##${w.slice(i, i + 3)}`);
        }
      }
    }
    return tokens;
  }

  /**
   * Add or update a document in the index
   * @param {string} id Unique document ID
   * @param {string} text Searchable text content
   * @param {object} payload Original object/metadata
   */
  indexDocument(id, text, payload = {}) {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return;

    // Remove old document if already present
    if (this.documents.has(id)) {
      this.removeDocument(id);
    }

    const docEntry = {
      id,
      text: String(text),
      tokens,
      payload,
      length: tokens.length,
      tf: new Map(),
      vector: null,
    };

    // Calculate term frequencies
    for (const t of tokens) {
      docEntry.tf.set(t, (docEntry.tf.get(t) || 0) + 1);
    }

    // Update inverted index and document frequencies
    for (const t of docEntry.tf.keys()) {
      if (!this.invertedIndex.has(t)) {
        this.invertedIndex.set(t, new Set());
      }
      this.invertedIndex.get(t).add(id);
      this.docFrequency.set(t, (this.docFrequency.get(t) || 0) + 1);
    }

    this.documents.set(id, docEntry);
    this.totalDocs = this.documents.size;
    this.totalTokens += docEntry.length;
    this.avgDocLength = this.totalDocs > 0 ? this.totalTokens / this.totalDocs : 0;
    this.isDirty = true;
  }

  /**
   * Remove a document from the index
   */
  removeDocument(id) {
    const docEntry = this.documents.get(id);
    if (!docEntry) return false;

    for (const t of docEntry.tf.keys()) {
      const set = this.invertedIndex.get(t);
      if (set) {
        set.delete(id);
        if (set.size === 0) this.invertedIndex.delete(t);
      }
      const df = (this.docFrequency.get(t) || 1) - 1;
      if (df <= 0) {
        this.docFrequency.delete(t);
      } else {
        this.docFrequency.set(t, df);
      }
    }

    this.documents.delete(id);
    this.totalDocs = this.documents.size;
    this.totalTokens = Math.max(0, this.totalTokens - docEntry.length);
    this.avgDocLength = this.totalDocs > 0 ? this.totalTokens / this.totalDocs : 0;
    this.isDirty = true;
    return true;
  }

  _updateAvgDocLength() {
    this.avgDocLength = this.totalDocs > 0 ? this.totalTokens / this.totalDocs : 0;
  }

  /**
   * Recompute vocabulary and document vectors when dirty
   */
  _ensureVectors() {
    if (!this.isDirty) return;

    // Select top vocabulary terms (terms appearing in at least 1 document)
    this.vocab.clear();
    let idx = 0;
    for (const [term, df] of this.docFrequency.entries()) {
      this.vocab.set(term, idx++);
    }

    const vocabSize = this.vocab.size;
    this.idfVector = new Float32Array(vocabSize);

    // Compute IDF values
    for (const [term, termIdx] of this.vocab.entries()) {
      const df = this.docFrequency.get(term) || 0;
      // Standard smoothed IDF
      this.idfVector[termIdx] = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));
    }

    // Build normalized TF-IDF vector for each document
    for (const doc of this.documents.values()) {
      const vec = new Float32Array(vocabSize);
      let normSq = 0;

      for (const [term, count] of doc.tf.entries()) {
        const vIdx = this.vocab.get(term);
        if (vIdx !== undefined) {
          // Log-scaled TF * IDF
          const tfVal = Math.log(1 + count);
          const weight = tfVal * this.idfVector[vIdx];
          vec[vIdx] = weight;
          normSq += weight * weight;
        }
      }

      // Normalize vector
      if (normSq > 0) {
        const norm = Math.sqrt(normSq);
        for (let i = 0; i < vocabSize; i++) {
          if (vec[i] !== 0) vec[i] /= norm;
        }
      }

      doc.vector = vec;
    }

    this.isDirty = false;
  }

  /**
   * Compute dense embedding vector for a query
   */
  _embedQuery(queryTokens) {
    this._ensureVectors();
    const vocabSize = this.vocab.size;
    const vec = new Float32Array(vocabSize);
    let normSq = 0;

    const qTf = new Map();
    for (const t of queryTokens) {
      qTf.set(t, (qTf.get(t) || 0) + 1);
    }

    for (const [term, count] of qTf.entries()) {
      const vIdx = this.vocab.get(term);
      if (vIdx !== undefined) {
        const tfVal = Math.log(1 + count);
        const weight = tfVal * this.idfVector[vIdx];
        vec[vIdx] = weight;
        normSq += weight * weight;
      }
    }

    if (normSq > 0) {
      const norm = Math.sqrt(normSq);
      for (let i = 0; i < vocabSize; i++) {
        if (vec[i] !== 0) vec[i] /= norm;
      }
    }

    return vec;
  }

  /**
   * Compute BM25 scores for all matching documents
   */
  _scoreBM25(queryTokens) {
    const scores = new Map();
    const queryTermCounts = new Map();
    for (const t of queryTokens) {
      queryTermCounts.set(t, (queryTermCounts.get(t) || 0) + 1);
    }

    for (const [term, qf] of queryTermCounts.entries()) {
      const matchingDocs = this.invertedIndex.get(term);
      if (!matchingDocs) continue;

      const df = matchingDocs.size;
      const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));

      for (const docId of matchingDocs) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        const tf = doc.tf.get(term) || 0;
        const denom =
          tf + this.k1 * (1 - this.b + this.b * (doc.length / (this.avgDocLength || 1)));
        const score = idf * ((tf * (this.k1 + 1)) / (denom || 1));

        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }

    return scores;
  }

  /**
   * Compute Vector Cosine Similarity scores for all documents
   */
  _scoreVector(queryVector) {
    this._ensureVectors();
    const scores = new Map();
    const vocabSize = this.vocab.size;

    // Find non-zero indices of query vector for sparse-dense dot product
    const nonZero = [];
    for (let i = 0; i < vocabSize; i++) {
      if (queryVector[i] !== 0) nonZero.push(i);
    }

    if (nonZero.length === 0) return scores;

    for (const [docId, doc] of this.documents.entries()) {
      if (!doc.vector) continue;
      let dot = 0;
      for (const idx of nonZero) {
        dot += queryVector[idx] * doc.vector[idx];
      }
      if (dot > 0.01) {
        scores.set(docId, dot);
      }
    }

    return scores;
  }

  /**
   * Perform Hybrid Search combining Dense Vector + BM25 using Reciprocal Rank Fusion (RRF)
   * @param {string} query Search query
   * @param {number} limit Number of results to return
   * @returns {Array} Ranked search results with scores and original payloads
   */
  search(query, limit = 10) {
    if (!query || this.totalDocs === 0) return [];
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    // 1. BM25 Lexical Ranking
    const bm25Scores = this._scoreBM25(queryTokens);
    const sortedBM25 = [...bm25Scores.entries()].sort((a, b) => b[1] - a[1]);

    // 2. Vector Semantic Cosine Ranking
    const queryVector = this._embedQuery(queryTokens);
    const vectorScores = this._scoreVector(queryVector);
    const sortedVector = [...vectorScores.entries()].sort((a, b) => b[1] - a[1]);

    // 3. Reciprocal Rank Fusion (RRF)
    const rrfScores = new Map();

    sortedBM25.forEach(([docId], rank) => {
      const score = 1 / (this.rrfK + rank + 1);
      rrfScores.set(docId, (rrfScores.get(docId) || 0) + score);
    });

    sortedVector.forEach(([docId], rank) => {
      const score = 1 / (this.rrfK + rank + 1);
      rrfScores.set(docId, (rrfScores.get(docId) || 0) + score);
    });

    // Sort by final combined RRF score
    const finalRanked = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

    return finalRanked.map(([docId, score]) => {
      const doc = this.documents.get(docId);
      return {
        id: docId,
        score: Number(score.toFixed(4)),
        bm25Score: Number((bm25Scores.get(docId) || 0).toFixed(3)),
        vectorScore: Number((vectorScores.get(docId) || 0).toFixed(3)),
        text: doc.text,
        payload: doc.payload,
      };
    });
  }

  /**
   * Calculate semantic cosine similarity between two text snippets
   */
  semanticSimilarity(textA, textB) {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const allTerms = new Set([...tokensA, ...tokensB]);

    // Fast cosine on term counts
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (const t of allTerms) {
      const cA = tokensA.filter((x) => x === t).length;
      const cB = tokensB.filter((x) => x === t).length;
      dot += cA * cB;
      normA += cA * cA;
      normB += cB * cB;
    }

    if (normA === 0 || normB === 0) return 0;
    return Number((dot / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
  }
}

// Export singleton instance
const hybridSearch = new HybridSearchEngine();
export default hybridSearch;
