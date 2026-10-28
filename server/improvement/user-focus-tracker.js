// SIS 1.0 — User Focus & Interaction Telemetry Engine
// Core RSI Component: Tracks user interaction patterns, domain gravitation,
// tool usage frequencies, friction signals, and task archetypes.
// Feeds 24/7 background learning so the AI recursively evolves on what the user uses it for most.

import fs from 'fs';
import { hasPassingOracle } from '../trajectory/learning-grade.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE_PATH = path.join(__dirname, '../../data/improvement/user-focus-profile.json');
const DEFAULT_CONVERSATIONS_DIR = path.join(__dirname, '../../data/conversations');
const LEARNED_SKILLS_DIR = path.join(__dirname, '../../data/skills/learned');

// Ensure storage directories exist
if (!fs.existsSync(path.dirname(DEFAULT_PROFILE_PATH))) {
  fs.mkdirSync(path.dirname(DEFAULT_PROFILE_PATH), { recursive: true });
}
if (!fs.existsSync(LEARNED_SKILLS_DIR)) {
  fs.mkdirSync(LEARNED_SKILLS_DIR, { recursive: true });
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'this',
  'with',
  'you',
  'are',
  'can',
  'how',
  'what',
  'make',
  'code',
  'file',
  'from',
  'have',
  'user',
  'system',
  'where',
  'when',
  'into',
  'over',
  'will',
  'using',
  'your',
  'about',
  'some',
  'there',
  'their',
  'them',
  'then',
  'than',
  'which',
  'just',
  'more',
  'also',
  'does',
  'want',
  'need',
  'like',
  'show',
  'look',
  'help',
  'know',
  'tell',
  'please',
  'here',
  'been',
  'were',
  'very',
  'much',
  'each',
  'both',
  'only',
  'would',
  'could',
  'should',
  'give',
  'take',
  'come',
  'think',
]);

class UserFocusTracker {
  constructor(options = {}) {
    this.profilePath = options.profilePath || DEFAULT_PROFILE_PATH;
    this.conversationsDir = options.conversationsDir || DEFAULT_CONVERSATIONS_DIR;
    this.learnedSkillsDir = options.learnedSkillsDir || LEARNED_SKILLS_DIR;
    this.saveTimeout = null;

    this.profile = {
      version: '1.0.0',
      lastUpdated: null,
      totalUserInteractions: 0,
      totalToolsExecuted: 0,
      totalCorrectionsEncountered: 0,
      domainScores: {
        coding: 0,
        '3d': 0,
        design: 0,
        research: 0,
        writing: 0,
        math: 0,
        physics: 0,
        systems: 0,
        general: 0,
      },
      toolMetrics: {},
      topKeywords: {},
      taskArchetypes: [],
      recentFrictionPoints: [],
      learnedSkills: [],
    };

    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.profilePath)) {
        const raw = fs.readFileSync(this.profilePath, 'utf8');
        const data = JSON.parse(raw);
        this.profile = {
          ...this.profile,
          ...data,
          domainScores: { ...this.profile.domainScores, ...(data.domainScores || {}) },
          toolMetrics: data.toolMetrics || {},
          topKeywords: data.topKeywords || {},
          taskArchetypes: data.taskArchetypes || [],
          recentFrictionPoints: data.recentFrictionPoints || [],
          learnedSkills: data.learnedSkills || [],
        };
      }
    } catch (err) {
      console.warn('[UserFocusTracker] Error loading profile, starting fresh:', err.message);
    }
  }

  _scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this._saveImmediate();
    }, 1500);
  }

  _saveImmediate() {
    try {
      const dir = path.dirname(this.profilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.profile.lastUpdated = Date.now();
      const tempPath = `${this.profilePath}.tmp_${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.profile, null, 2), 'utf8');
      fs.renameSync(tempPath, this.profilePath);
    } catch (err) {
      console.error('[UserFocusTracker] Save error:', err.message);
    }
  }

  /**
   * Initialize and bootstrap baseline from historical conversations on disk
   */
  async initialize() {
    try {
      if (this.profile.totalUserInteractions === 0 && fs.existsSync(this.conversationsDir)) {
        console.log(
          '[UserFocusTracker] Bootstrapping user focus profile from historical conversations...',
        );
        this.bootstrapFromHistory();
      }
      this._syncLearnedSkillsFromDisk();
      console.log(
        `[UserFocusTracker] Initialized. Top domain: ${this.getTopDomain()} | Interactions: ${this.profile.totalUserInteractions}`,
      );
    } catch (err) {
      console.warn('[UserFocusTracker] Initialization notice:', err.message);
    }
  }

  /**
   * Parse all past conversation files to extract historical baseline
   */
  bootstrapFromHistory() {
    try {
      if (!fs.existsSync(this.conversationsDir)) return;
      const files = fs.readdirSync(this.conversationsDir).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        try {
          const fullPath = path.join(this.conversationsDir, file);
          const raw = fs.readFileSync(fullPath, 'utf8');
          const conv = JSON.parse(raw);
          if (!conv || !Array.isArray(conv.messages)) continue;

          for (let i = 0; i < conv.messages.length; i++) {
            const msg = conv.messages[i];
            if (msg.role === 'user' && msg.content) {
              const domain = this.detectDomain(msg.content);
              this._ingestUserMessage(
                msg.content,
                domain,
                conv.updatedAt || conv.createdAt || Date.now(),
              );
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      this._saveImmediate();
      console.log(
        `[UserFocusTracker] Historical bootstrap complete. Analyzed ${files.length} conversations.`,
      );
    } catch (err) {
      console.warn('[UserFocusTracker] Bootstrap error:', err.message);
    }
  }

  detectDomain(text) {
    const m = String(text || '').toLowerCase();
    if (
      /blender|three\.js|threejs|mesh|render|shader|texture|pbr|3d model|gltf|glb|geometry/i.test(m)
    )
      return '3d';
    if (
      /code|function|debug|algorithm|bug|test|node|python|javascript|typescript|react|api|endpoint|server|build|script|npm/i.test(
        m,
      )
    )
      return 'coding';
    if (/design|ui|ux|layout|css|style|color|palette|frontend|animation|glassmorphism/i.test(m))
      return 'design';
    if (/math|calc|equation|integral|derivative|algebra|proof|matrix|tensor|statistics/i.test(m))
      return 'math';
    if (/physics|quantum|force|energy|thermodynamics|relativity|particle|wave/i.test(m))
      return 'physics';
    if (
      /architecture|distributed|consensus|database|lock-free|concurrency|ipc|memory|cache/i.test(m)
    )
      return 'systems';
    if (/research|paper|study|literature|citations|analyze|analysis|investigate/i.test(m))
      return 'research';
    if (/write|essay|article|story|document|blog|draft|summary/i.test(m)) return 'writing';
    return 'general';
  }

  _ingestUserMessage(content, domain, timestamp = Date.now()) {
    this.profile.totalUserInteractions++;

    // 1. Exponential time decay & domain scoring
    // Recent interactions get full weight 1.0; older interactions scale down
    const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-0.1 * Math.max(0, ageDays)); // 7-day half-life decay approx
    const weight = Math.max(0.2, decay);

    this.profile.domainScores[domain] = (this.profile.domainScores[domain] || 0) + weight;

    // 2. Keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const w of words) {
      this.profile.topKeywords[w] = (this.profile.topKeywords[w] || 0) + 1;
    }

    // 3. Task Archetype Identification
    this._identifyTaskArchetype(content, domain);
  }

  _identifyTaskArchetype(content, domain) {
    const m = content.toLowerCase();
    let archetype = null;

    if (/blender|bpy/i.test(m)) archetype = 'Blender Python Automation & Modeling';
    else if (/three\.js|threejs|webgl|shader|canvas/i.test(m))
      archetype = 'Interactive 3D Three.js Visualizations';
    else if (/api|endpoint|express|websocket|backend/i.test(m))
      archetype = 'Full-Stack Node.js & API Engineering';
    else if (/debug|error|fix|failed|crash|bug/i.test(m))
      archetype = 'Root-Cause Debugging & Self-Healing Code';
    else if (/quantum|physics|theory|concurrency/i.test(m))
      archetype = 'Theoretical & Algorithmic Analysis';
    else if (/ui|css|interface|html/i.test(m)) archetype = 'Modern Frontend & UI Design';

    if (archetype) {
      const existing = this.profile.taskArchetypes.find((a) => a.name === archetype);
      if (existing) {
        existing.count++;
        existing.lastSeenAt = Date.now();
      } else {
        this.profile.taskArchetypes.push({
          name: archetype,
          domain,
          count: 1,
          lastSeenAt: Date.now(),
        });
      }
      this.profile.taskArchetypes.sort((a, b) => b.count - a.count);
      if (this.profile.taskArchetypes.length > 12) this.profile.taskArchetypes.pop();
    }
  }

  /**
   * Record real-time user interaction from brain.js
   */
  recordInteraction({
    userMessage,
    toolsUsed = [],
    partsUsed = [],
    reviewIssues = [],
    isCorrection = false,
    qualityScore = null,
  }) {
    if (!userMessage) return;

    const domain = this.detectDomain(userMessage);
    this._ingestUserMessage(userMessage, domain, Date.now());

    // Record tool executions
    if (Array.isArray(toolsUsed)) {
      for (const t of toolsUsed) {
        const toolName = typeof t === 'string' ? t : t.tool || t.name;
        if (!toolName) continue;
        this.profile.totalToolsExecuted++;
        if (!this.profile.toolMetrics[toolName]) {
          this.profile.toolMetrics[toolName] = { calls: 0, errors: 0, lastUsed: Date.now() };
        }
        this.profile.toolMetrics[toolName].calls++;
        this.profile.toolMetrics[toolName].lastUsed = Date.now();
        if (t.error || t.success === false) {
          this.profile.toolMetrics[toolName].errors++;
        }
      }
    }

    // Record user friction & corrections
    if (isCorrection) {
      this.profile.totalCorrectionsEncountered++;
      this.profile.recentFrictionPoints.unshift({
        type: 'user-correction',
        domain,
        message: userMessage.slice(0, 160),
        timestamp: Date.now(),
      });
    }

    if (Array.isArray(reviewIssues) && reviewIssues.length > 0) {
      for (const iss of reviewIssues.slice(0, 2)) {
        this.profile.recentFrictionPoints.unshift({
          type: 'inner-review-interrupt',
          domain,
          reason: iss.reason || 'Code repair',
          timestamp: Date.now(),
        });
      }
    }

    if (this.profile.recentFrictionPoints.length > 20) {
      this.profile.recentFrictionPoints = this.profile.recentFrictionPoints.slice(0, 20);
    }

    this._scheduleSave();
  }

  /**
   * Return mathematically normalized domain gravity profile
   */
  getGravityProfile() {
    const totalScore = Object.values(this.profile.domainScores).reduce((acc, v) => acc + v, 0) || 1;
    const normalizedDomains = Object.entries(this.profile.domainScores)
      .map(([domain, score]) => ({
        domain,
        score: Number(score.toFixed(2)),
        percentage: Math.round((score / totalScore) * 100),
      }))
      .sort((a, b) => b.score - a.score);

    const sortedTools = Object.entries(this.profile.toolMetrics)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.calls - a.calls);

    const sortedKeywords = Object.entries(this.profile.topKeywords)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      totalInteractions: this.profile.totalUserInteractions,
      topDomain: normalizedDomains[0]?.domain || 'general',
      domainDistribution: normalizedDomains,
      topTools: sortedTools.slice(0, 8),
      topKeywords: sortedKeywords,
      primaryTaskArchetype:
        this.profile.taskArchetypes[0]?.name || 'General Interactive Engineering',
      activeTaskArchetypes: this.profile.taskArchetypes.slice(0, 5),
      recentFriction: this.profile.recentFrictionPoints.slice(0, 5),
      learnedSkillsCount: this.profile.learnedSkills.length,
    };
  }

  getTopDomain() {
    let top = 'general';
    let max = -1;
    for (const [dom, score] of Object.entries(this.profile.domainScores)) {
      if (score > max) {
        max = score;
        top = dom;
      }
    }
    return top;
  }

  /**
   * Return high-level affinity summary of what the user uses SIS for most
   */
  getDominantAffinity() {
    const profile = this.getGravityProfile();
    const top = profile.domainDistribution[0] || { domain: 'coding', percentage: 40 };
    return {
      topDomain: top.domain,
      percentage: top.percentage,
      isDominant: top.percentage >= 25,
      allDomains: profile.domainDistribution,
      topKeywords: profile.topKeywords.slice(0, 8).map((k) => k.word),
      summary: `User uses SIS predominantly for "${top.domain}" (${top.percentage}% of interactions), followed by ${profile.domainDistribution[1]?.domain || 'general'} (${profile.domainDistribution[1]?.percentage || 0}%).`,
    };
  }

  /**
   * Synthesize tailored guidance prompt for AutonomousLearner
   */
  getInquiryGuidance() {
    const profile = this.getGravityProfile();
    const topDomains = profile.domainDistribution
      .slice(0, 3)
      .map((d) => `${d.domain} (${d.percentage}%)`)
      .join(', ');
    const topTools = profile.topTools
      .slice(0, 5)
      .map((t) => t.name)
      .join(', ');
    const topKws = profile.topKeywords
      .slice(0, 8)
      .map((k) => k.word)
      .join(', ');
    const frictionSummary = profile.recentFriction
      .map((f) => `- [${f.domain}] ${f.type}: ${f.reason || f.message || ''}`)
      .join('\n');

    return {
      topDomains,
      topTools:
        topTools || 'create_file, write_file, web_search, generate_3d_scene, blender_create',
      topKeywords: topKws,
      primaryTask: profile.primaryTaskArchetype,
      recentFriction: frictionSummary || 'None detected',
      domainGravityList: profile.domainDistribution,
    };
  }

  /**
   * Register a newly compiled autonomous skill
   */
  recordLearnedSkill(skill) {
    if (!skill || !skill.id) return;
    const existingIdx = this.profile.learnedSkills.findIndex((s) => s.id === skill.id);
    if (existingIdx >= 0) {
      this.profile.learnedSkills[existingIdx] = {
        ...this.profile.learnedSkills[existingIdx],
        ...skill,
        updatedAt: Date.now(),
      };
    } else {
      this.profile.learnedSkills.push({
        ...skill,
        createdAt: Date.now(),
      });
    }
    this._scheduleSave();
  }

  _syncLearnedSkillsFromDisk() {
    try {
      if (!fs.existsSync(this.learnedSkillsDir)) return;
      const files = fs.readdirSync(this.learnedSkillsDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.learnedSkillsDir, file), 'utf8');
          const skill = JSON.parse(raw);
          if (skill && skill.id && !this.profile.learnedSkills.some((s) => s.id === skill.id)) {
            this.profile.learnedSkills.push(skill);
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[UserFocusTracker] Skill sync error:', err.message);
    }
  }

  listLearnedSkills() {
    return this.profile.learnedSkills.filter(hasPassingOracle);
  }

  /**
   * Normalise a domain to a set of tokens.
   *
   * The learner, the prompt compiler and this tracker historically used three
   * disjoint vocabularies (`computational-geometry` vs `3d` vs `coding`, plus
   * legacy composite keys like `coding|3d|design`). Exact `===` matching
   * therefore missed 71% of the corpus. Matching on tokens makes
   * `computational-geometry` relevant to a `3d` query and splits composites.
   */
  static domainTokens(domain = '') {
    const raw = String(domain || '').toLowerCase();
    // Split composite/legacy keys on any non-alphanumeric separator.
    const parts = raw.split(/[^a-z0-9]+/).filter(Boolean);
    const synonyms = {
      'computational-geometry': [
        '3d',
        'geometry',
        'graphics',
        'render',
        'shader',
        'mesh',
        'webgl',
        'spatial',
      ],
      'webgl-game-engine-architecture': ['3d', 'webgl', 'graphics', 'render', 'engine'],
      coding: ['code', 'compiler', 'compilers', 'programming', 'software'],
      'compilers-ast': ['coding', 'compiler', 'compilers', 'code', 'parser'],
      'concurrency-lockfree': ['systems', 'concurrency', 'lockfree', 'parallel'],
      'distributed-consensus': ['systems', 'distributed', 'consensus'],
      'database-internals': ['systems', 'database', 'storage'],
      'simd-vector-math': ['math', 'simd', 'vector', 'numeric'],
      'symbolic-verification': ['math', 'proof', 'verification', 'formal'],
      'probabilistic-data-structures': ['math', 'probabilistic', 'data-structures'],
      'information-retrieval': ['research', 'search', 'retrieval'],
      'ai-cognition': ['research', 'ai', 'cognition', 'learning'],
      'autonomous-agents': ['research', 'agents', 'autonomous'],
      design: ['ui', 'ux', 'design', 'layout', 'css'],
      physics: ['physics', 'quantum', 'thermodynamics'],
      general: [],
    };

    const tokens = new Set(parts);
    for (const p of parts) {
      for (const syn of synonyms[p] || []) tokens.add(syn);
    }
    return tokens;
  }

  getRelevantLearnedSkills(domain = '', userQuery = '', maxCount = 3) {
    const skills = this.listLearnedSkills();
    if (skills.length === 0) return [];

    const qTokens = new Set(
      (userQuery || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    const wanted = UserFocusTracker.domainTokens(domain);

    const scored = skills.map((skill) => {
      let score = 0;
      if (wanted.size > 0) {
        const have = UserFocusTracker.domainTokens(skill.domain);
        let overlap = 0;
        for (const t of wanted) if (have.has(t)) overlap++;
        // Full token overlap keeps the old 0.5 weight; partial scales down.
        if (overlap > 0) score += 0.5 * (overlap / Math.max(wanted.size, 1));
      }

      const titleWords = (skill.title || skill.name || '').toLowerCase().split(/\s+/);
      for (const w of titleWords) {
        if (qTokens.has(w)) score += 0.2;
      }

      // Verified skills outrank unverified candidates at equal text relevance.
      if (hasPassingOracle(skill)) score += 0.3;

      return { skill, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map((s) => s.skill);
  }

  /**
   * Render retrieved skills for the system prompt.
   *
   * Verification status is stated, never implied. A skill that was never run
   * against an oracle is labelled UNVERIFIED in the prompt itself — earlier
   * versions printed "(Verified: 0.95)" for skills nothing had ever executed.
   */
  formatSkillsForPrompt(domain = '', userQuery = '', maxChars = 1000) {
    const relevant = this.getRelevantLearnedSkills(domain, userQuery, 3);
    if (relevant.length === 0) return '';

    const lines = [
      `### [LEARNED SKILLS // ${(domain || 'GENERAL').toUpperCase()}]`,
      'Status key: VERIFIED = ran against a deterministic expected-output oracle. UNVERIFIED = candidate only; treat its recipe as a hypothesis.',
    ];

    for (const sk of relevant) {
      const observed = hasPassingOracle(sk);
      const label = observed
        ? `VERIFIED reward ${sk.verifiedScore.toFixed(3)}${sk.verification?.testsTotal ? ` (${sk.verification.testsPassed}/${sk.verification.testsTotal} cases)` : ''}`
        : 'UNVERIFIED';
      lines.push(`- **Skill**: ${sk.title || sk.name} — ${label}`);
      if (sk.recipe) {
        // Verified recipes are worth more prompt space than hunches.
        const budget = observed ? 900 : 350;
        lines.push(`  Recipe/Code:\n  \`\`\`\n  ${sk.recipe.slice(0, budget)}\n  \`\`\``);
      }
    }

    const out = lines.join('\n');
    return out.length > maxChars ? out.slice(0, maxChars) + '...' : out;
  }

  getFrictionRemediationContext(domain = '', maxChars = 600) {
    const fPoints = this.profile.recentFrictionPoints || [];
    const relevant = domain ? fPoints.filter((f) => f.domain === domain) : fPoints;
    if (relevant.length === 0) return '';

    const lines = [`### [USER FRICTION REMEDIATION // ${(domain || 'GENERAL').toUpperCase()}]`];
    for (const f of relevant.slice(0, 3)) {
      lines.push(`• Guard against: "${f.message || f.reason || 'past error'}" (${f.type})`);
    }

    const out = lines.join('\n');
    return out.length > maxChars ? out.slice(0, maxChars) + '...' : out;
  }
}

const userFocusTracker = new UserFocusTracker();
export default userFocusTracker;
