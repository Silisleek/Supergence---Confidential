// SIS 1.0 — Pattern Recognition Engine
// Pillar 1: High-dimension motif, symmetry, anomaly, and invariant detection across text, data, and code

export class PatternRecognitionEngine {
  constructor() {
    this.knownPatterns = new Map();
    this.recentDetections = [];
  }

  /**
   * Universal Pattern Detection Pipeline
   * Dispatches input to domain-specific pattern recognizers and synthesizes findings.
   */
  analyze(input, options = {}) {
    const startTime = Date.now();
    const findings = {
      timestamp: startTime,
      inputType: this._inferType(input),
      motifs: [],
      symmetries: [],
      anomalies: [],
      invariants: [],
      confidence: 0.95,
    };

    if (typeof input === 'string') {
      const codePatterns = this.detectCodePatterns(input);
      const textPatterns = this.detectTextualPatterns(input);
      findings.motifs.push(...codePatterns.motifs, ...textPatterns.motifs);
      findings.anomalies.push(...codePatterns.anomalies, ...textPatterns.anomalies);
      findings.symmetries.push(...codePatterns.symmetries);
      findings.invariants.push(...codePatterns.invariants, ...textPatterns.invariants);
    } else if (Array.isArray(input)) {
      const seqPatterns = this.detectSequencePatterns(input);
      findings.motifs.push(...seqPatterns.motifs);
      findings.anomalies.push(...seqPatterns.anomalies);
      findings.invariants.push(...seqPatterns.invariants);
      findings.symmetries.push(...seqPatterns.symmetries);
    } else if (typeof input === 'object' && input !== null) {
      const structPatterns = this.detectStructuralPatterns(input);
      findings.motifs.push(...structPatterns.motifs);
      findings.symmetries.push(...structPatterns.symmetries);
      findings.invariants.push(...structPatterns.invariants);
    }

    findings.elapsedMs = Date.now() - startTime;
    this.recentDetections.unshift(findings);
    if (this.recentDetections.length > 50) this.recentDetections.pop();

    return findings;
  }

  _inferType(input) {
    if (typeof input === 'string') {
      if (/(?:function|class|import|const|let|def|return|<[a-z]+[\s>])/i.test(input)) return 'code';
      if (/^[\s\[\{]/.test(input) && (input.includes('":') || input.includes('",')))
        return 'serialized-data';
      return 'text';
    }
    if (Array.isArray(input)) return 'sequence';
    if (typeof input === 'object' && input !== null) return 'object-graph';
    return typeof input;
  }

  /**
   * Detect patterns in textual and linguistic prompts
   */
  detectTextualPatterns(text) {
    const motifs = [];
    const anomalies = [];
    const invariants = [];

    // 1. Repetition and redundancy motifs
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const freq = new Map();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    for (const [w, count] of freq.entries()) {
      if (
        count >= 3 &&
        !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'into'].includes(w)
      ) {
        motifs.push(`Frequent keyword motif: "${w}" (${count} occurrences)`);
      }
    }

    // 2. Intent & constraint patterns
    if (/\b(?:must|always|never|strictly|guarantee|without fail)\b/i.test(text)) {
      invariants.push('Hard deontic constraints detected (strict invariant enforcement required)');
    }
    if (/\b(?:step by step|one by one|break down|systematically)\b/i.test(text)) {
      motifs.push('Sequential decomposition request pattern');
    }
    if (/\b(?:compare|versus|vs|contrast|difference)\b/i.test(text)) {
      motifs.push('Comparative dichotomy pattern');
    }

    return { motifs, anomalies, invariants };
  }

  /**
   * Detect patterns in code, architectures, and scripts
   */
  detectCodePatterns(code) {
    const motifs = [];
    const anomalies = [];
    const symmetries = [];
    const invariants = [];

    // Structural architectural motifs
    if (/class\s+[A-Za-z0-9_]+\s+extends\s+/i.test(code))
      motifs.push('Inheritance hierarchy pattern');
    if (/new\s+Promise|\basync\s+|\bawait\b/i.test(code))
      motifs.push('Asynchronous concurrency pattern');
    if (/\b(?:subscribe|on\('|addEventListener|emit\()/i.test(code))
      motifs.push('Observer / Pub-Sub event pattern');
    if (/(?:function\s+[a-z0-9_]+\s*\([^)]*\)\s*\{[^\}]*\b[a-z0-9_]+\s*\()/i.test(code))
      motifs.push('Recursive self-calling pattern');
    if (/\b(?:map|filter|reduce|flatMap)\b/i.test(code))
      motifs.push('Functional transformation pipeline pattern');

    // Symmetries
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces === closeBraces) {
      symmetries.push(`Syntactic bracket symmetry verified (${openBraces} pairs)`);
    } else {
      anomalies.push(`Bracket asymmetry detected: ${openBraces} '{' vs ${closeBraces} '}'`);
    }

    // Invariants & potential anti-patterns
    if (/\b(?:while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\))/i.test(code)) {
      anomalies.push('Unbounded loop detected (potential non-termination)');
    }
    if (/\btry\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{\s*\}/i.test(code)) {
      anomalies.push('Empty catch block detected (silent error suppression anti-pattern)');
    }
    if (/\/\/\s*TODO\b/i.test(code)) {
      anomalies.push('Incomplete implementation stub (TODO comment motif)');
    }

    return { motifs, anomalies, symmetries, invariants };
  }

  /**
   * Detect numerical, time-series, or item sequence patterns
   */
  detectSequencePatterns(arr) {
    const motifs = [];
    const anomalies = [];
    const symmetries = [];
    const invariants = [];

    if (arr.length === 0) return { motifs, anomalies, symmetries, invariants };

    // Check if numeric sequence
    const allNumeric = arr.every((x) => typeof x === 'number' && !isNaN(x));
    if (allNumeric && arr.length >= 3) {
      // 1. Arithmetic progression check
      const diffs = [];
      for (let i = 1; i < arr.length; i++) diffs.push(arr[i] - arr[i - 1]);
      const isAP = diffs.every((d) => Math.abs(d - diffs[0]) < 1e-9);
      if (isAP) {
        motifs.push(`Linear Arithmetic Progression with common difference d = ${diffs[0]}`);
        invariants.push(`f(n) = ${arr[0]} + n * ${diffs[0]}`);
      }

      // 2. Geometric progression check
      if (arr.every((x) => x !== 0)) {
        const ratios = [];
        for (let i = 1; i < arr.length; i++) ratios.push(arr[i] / arr[i - 1]);
        const isGP = ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9);
        if (isGP) {
          motifs.push(`Geometric Progression with common ratio r = ${ratios[0]}`);
          invariants.push(`f(n) = ${arr[0]} * (${ratios[0]})^n`);
        }
      }

      // 3. Monotonicity
      const isIncreasing = diffs.every((d) => d >= 0);
      const isDecreasing = diffs.every((d) => d <= 0);
      if (isIncreasing) invariants.push('Strictly or weakly monotonically non-decreasing');
      if (isDecreasing) invariants.push('Strictly or weakly monotonically non-increasing');

      // 4. Mean and outlier detection
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) {
        for (let i = 0; i < arr.length; i++) {
          const zScore = Math.abs((arr[i] - mean) / stdDev);
          if (zScore > 2.5) {
            anomalies.push(
              `Statistical anomaly at index ${i}: value ${arr[i]} (z-score ${zScore.toFixed(2)})`,
            );
          }
        }
      }

      // 5. Palindromic symmetry
      let isPalindromic = true;
      for (let i = 0; i < Math.floor(arr.length / 2); i++) {
        if (arr[i] !== arr[arr.length - 1 - i]) {
          isPalindromic = false;
          break;
        }
      }
      if (isPalindromic) symmetries.push('Palindromic reflection symmetry');
    }

    return { motifs, anomalies, symmetries, invariants };
  }

  /**
   * Detect structural, schema, and topological patterns in objects
   */
  detectStructuralPatterns(obj) {
    const motifs = [];
    const symmetries = [];
    const invariants = [];

    const keys = Object.keys(obj);
    motifs.push(`Key dimensionality: ${keys.length} root fields`);

    const hasTimestamps = keys.some((k) => /time|date|at|created|updated/i.test(k));
    if (hasTimestamps) motifs.push('Temporal entity pattern (contains timestamp markers)');

    const hasIds = keys.some((k) => /id|uuid|guid|key/i.test(k));
    if (hasIds) motifs.push('Entity relational identifier pattern');

    // Depth analysis
    const getDepth = (o) => {
      if (typeof o !== 'object' || o === null) return 0;
      let maxDepth = 0;
      for (const k of Object.keys(o)) {
        maxDepth = Math.max(maxDepth, getDepth(o[k]));
      }
      return 1 + maxDepth;
    };

    const depth = getDepth(obj);
    invariants.push(`Structural tree depth = ${depth}`);

    return { motifs, symmetries, invariants };
  }
}

const patternEngine = new PatternRecognitionEngine();
export default patternEngine;
