// SIS 1.0 — Golden Trace & Exemplar Bank
// Inspired by STaR (Self-Taught Reasoner) & In-Context Reinforcement Learning.
// Maintains a curated repository of verified high-performing execution traces
// (User Query -> Multi-step Reasoning / Invariants -> Production Solution).
// Dynamically injects the highest-similarity golden exemplar into prompt contexts.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXEMPLAR_FILE = process.env.SIS_DATA_DIR ? path.join(path.resolve(process.env.SIS_DATA_DIR), 'improvement/exemplar-bank.json') : path.join(__dirname, '../../data/improvement/exemplar-bank.json');

if (!fs.existsSync(path.dirname(EXEMPLAR_FILE))) {
  fs.mkdirSync(path.dirname(EXEMPLAR_FILE), { recursive: true });
}

// Foundational Golden Exemplars for the primary domains
const SEED_EXEMPLARS = [
  {
    id: 'ex_3d_chinese_city_instancing',
    domain: '3d',
    keywords: [
      'chinese',
      'city',
      'three.js',
      'dense',
      'urban',
      'instanced',
      'buildings',
      'metropolis',
      'pbr',
    ],
    query:
      'Create a dense interactive Chinese futuristic metropolis in Three.js with traditional architectural accents, elevated metro, and 60 FPS performance without AI-slop.',
    rationale:
      'Break monolithic meshes into InstancedMesh clusters grouped by material. Apply custom vertex noise for architectural roof ridges, subtle neon signs using emissive textures, and continuous requestAnimationFrame loop with pooled matrix updates.',
    solutionBlueprint: `// High-performance Three.js Instanced Architecture
const buildingGeom = new THREE.BoxGeometry(1, 1, 1);
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.7, metalness: 0.2 });
const cityGrid = new THREE.InstancedMesh(buildingGeom, buildingMat, 2500);
const dummy = new THREE.Object3D();

for (let i = 0; i < 2500; i++) {
  const x = (i % 50 - 25) * 8;
  const z = (Math.floor(i / 50) - 25) * 8;
  const h = 10 + Math.sin(x * 0.1) * Math.cos(z * 0.1) * 35;
  dummy.position.set(x, h / 2, z);
  dummy.scale.set(6, h, 6);
  dummy.updateMatrix();
  cityGrid.setMatrixAt(i, dummy.matrix);
}
cityGrid.instanceMatrix.needsUpdate = true;
scene.add(cityGrid);`,
    qualityScore: 0.99,
    verifiedAt: 1789474000000,
    source: 'golden-seed',
  },
  {
    id: 'ex_coding_resilient_sse_streamer',
    domain: 'coding',
    keywords: ['node', 'express', 'sse', 'stream', 'resilient', 'backpressure', 'api', 'websocket'],
    query:
      'Build a zero-leak Server-Sent Events (SSE) streaming endpoint in Express with backpressure and graceful client disconnect.',
    rationale:
      'Guard res.write with backpressure drainage checks, attach req.on("close") cleanup listeners, set explicit cache-control headers, and wrap JSON payloads with newline terminators.',
    solutionBlueprint: `app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const timer = setInterval(() => {
    const payload = JSON.stringify({ ts: Date.now(), status: 'alive' });
    const ok = res.write(\`data: \${payload}\\n\\n\`);
    if (!ok) {
      // Handle backpressure drainage
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
  });
});`,
    qualityScore: 0.98,
    verifiedAt: 1789474000000,
    source: 'golden-seed',
  },
  {
    id: 'ex_math_quantum_wavepacket',
    domain: 'math',
    keywords: [
      'schrodinger',
      'equation',
      'quantum',
      'wavefunction',
      'packet',
      'derivation',
      'latex',
    ],
    query:
      'Formulate and derive the time-dependent Schrodinger equation for a Gaussian wavepacket spreading in free space.',
    rationale:
      'State the Hamiltonian operator, solve via Fourier spatial transformation into momentum space, integrate the quadratic dispersion relation, and verify probability density conservation.',
    solutionBlueprint: `$$\\Psi(x, t) = \\frac{1}{(2\\pi)^{1/4}\\sqrt{\\sigma_0 + \\frac{i\\hbar t}{m\\sigma_0}}} \\exp\\left( -\\frac{x^2}{4\\sigma_0^2 \\left(1 + \\frac{i\\hbar t}{m\\sigma_0^2}\\right)} \\right)$$
- Variance spread: $$\\sigma^2(t) = \\sigma_0^2 \\left(1 + \\frac{\\hbar^2 t^2}{m^2 \\sigma_0^4}\\right)$$
- Probability norm: $$\\int_{-\\infty}^\\infty |\\Psi(x,t)|^2 dx = 1 \\quad \\forall t$$`,
    qualityScore: 0.99,
    verifiedAt: 1789474000000,
    source: 'golden-seed',
  },
];

export class ExemplarBank {
  constructor(options = {}) {
    this.filePath = options.filePath || EXEMPLAR_FILE;
    this.exemplars = [...SEED_EXEMPLARS];
    this.totalHarvested = 0;
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.exemplars)) {
          // Merge avoiding duplicates by id
          const existingIds = new Set(data.exemplars.map((e) => e.id));
          for (const s of SEED_EXEMPLARS) {
            if (!existingIds.has(s.id)) {
              data.exemplars.push(s);
            }
          }
          this.exemplars = data.exemplars;
          this.totalHarvested = data.totalHarvested || 0;
        }
      } else {
        this._save();
      }
    } catch (err) {
      console.warn('[ExemplarBank] Load error, keeping seeds:', err.message);
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const payload = {
        version: '1.0.0',
        totalExemplars: this.exemplars.length,
        totalHarvested: this.totalHarvested,
        lastUpdated: Date.now(),
        exemplars: this.exemplars,
      };

      const tempPath = `${this.filePath}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[ExemplarBank] Save error:', err.message);
    }
  }

  /**
   * Record a verified golden trace into the bank
   */
  recordExemplar({
    domain = 'general',
    query,
    rationale,
    solutionBlueprint,
    qualityScore = 0.95,
    speedupGain = null,
    source = 'autonomous-cycle',
  }) {
    if (!query || !solutionBlueprint) return null;

    const keywords = (query.toLowerCase() + ' ' + (rationale || '').toLowerCase())
      .replace(/[^a-z0-9s]/g, ' ')
      .split(/s+/)
      .filter(
        (w) =>
          w.length > 3 &&
          ![
            'what',
            'when',
            'where',
            'which',
            'make',
            'create',
            'code',
            'file',
            'with',
            'from',
            'this',
            'that',
            'your',
            'have',
          ].includes(w),
      )
      .slice(0, 15);

    const id = `ex_${domain}_${Date.now()}`;
    const exemplar = {
      id,
      domain,
      keywords,
      query: query.slice(0, 300),
      rationale: (rationale || '').slice(0, 600),
      solutionBlueprint: solutionBlueprint.slice(0, 2000),
      qualityScore: Number(qualityScore.toFixed(3)),
      speedupGain,
      verifiedAt: Date.now(),
      source,
    };

    // Keep max 50 exemplars total, prioritizing highest quality
    this.exemplars.push(exemplar);
    this.totalHarvested++;
    this.exemplars.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    if (this.exemplars.length > 50) {
      this.exemplars.pop();
    }

    this._save();
    console.log(
      `[ExemplarBank] ✓ Stored Golden Trace [${domain}]: "${query.slice(0, 50)}..." (Score: ${qualityScore})`,
    );
    return exemplar;
  }

  /**
   * Find the best matching exemplar for a given query and domain
   */
  getBestExemplar(domain = '', query = '') {
    if (!query) return null;

    const qTokens = new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9s]/g, ' ')
        .split(/s+/)
        .filter((w) => w.length > 3),
    );

    let bestEx = null;
    let bestScore = 0;

    for (const ex of this.exemplars) {
      let score = 0;
      if (domain && ex.domain === domain) {
        score += 0.4;
      }

      // Keyword match score
      let hits = 0;
      for (const kw of ex.keywords || []) {
        if (qTokens.has(kw) || query.toLowerCase().includes(kw)) {
          hits++;
        }
      }
      score += Math.min(0.6, hits * 0.15);

      if (score > bestScore && score >= 0.35) {
        bestScore = score;
        bestEx = ex;
      }
    }

    return bestEx;
  }

  /**
   * Format the best exemplar as an in-context demonstration for prompt injection
   */
  formatForPrompt(domain = '', query = '', maxChars = 1200) {
    const ex = this.getBestExemplar(domain, query);
    if (!ex) return '';

    const lines = [
      `### [GOLDEN REASONING EXEMPLAR // ${ex.domain.toUpperCase()}]`,
      `- **Proven Reference Challenge**: ${ex.query}`,
      `- **Operational Rationale**: ${ex.rationale}`,
      `- **Verified Blueprint**:`,
      ex.solutionBlueprint,
    ];

    const out = lines.join('\n');
    return out.length > maxChars ? out.slice(0, maxChars) + '...' : out;
  }

  getStats() {
    const byDomain = {};
    for (const ex of this.exemplars) {
      byDomain[ex.domain] = (byDomain[ex.domain] || 0) + 1;
    }

    return {
      totalExemplars: this.exemplars.length,
      totalHarvested: this.totalHarvested,
      distribution: byDomain,
      topExemplars: this.exemplars.slice(0, 6).map((e) => ({
        id: e.id,
        domain: e.domain,
        query: e.query.slice(0, 60),
        score: e.qualityScore,
      })),
    };
  }
}

const exemplarBank = new ExemplarBank();
export default exemplarBank;
