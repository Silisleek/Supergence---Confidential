// SIS 1.0 — Multi-SIS Systems & Field Specialization Engine
// Enables creation of unlimited fresh, isolated SIS systems for any task or field

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SYSTEMS_BASE_DIR = path.resolve(PROJECT_ROOT, 'data', 'systems');
const SYSTEMS_META_FILE = path.resolve(SYSTEMS_BASE_DIR, 'systems-registry.json');

// Ensure base systems directory exists
if (!fs.existsSync(SYSTEMS_BASE_DIR)) {
  fs.mkdirSync(SYSTEMS_BASE_DIR, { recursive: true });
}

export class SystemManager {
  constructor() {
    this.systems = new Map();
    this.activeSystemId = 'default';
    this._subsystems = null; // reference to brain subsystems { workspace, shortTermMemory, longTermMemory, knowledgeGraph, conversations, autonomousLearner, brain }
    this._initDefaultSystem();
    this._loadSystems();
  }

  /**
   * Bind runtime subsystem singletons for dynamic retargeting
   */
  bindSubsystems(subsystems) {
    this._subsystems = subsystems;
  }

  /**
   * Define the default general superintelligence system (preserves all existing data)
   */
  _initDefaultSystem() {
    const defaultSys = {
      id: 'default',
      name: 'SIS // MK-10',
      field: 'General Superintelligence & Frontier Engineering',
      trainingObjective:
        'Autonomous multi-domain problem solving, cross-domain theory synthesis, and 24/7 empirical self-improvement.',
      description:
        'Primary superintelligence system with 25 specialized subconscious agents and empirical verification.',
      isDefault: true,
      createdAt: 1789300000000,
      lastActiveAt: Date.now(),
      trainingLevel: 10,
      trainingSessions: [],
      paths: {
        workspaceDir: path.resolve(PROJECT_ROOT, 'workspace'),
        stmPath: path.resolve(PROJECT_ROOT, 'data', 'memory', 'short-term.json'),
        ltmPath: path.resolve(PROJECT_ROOT, 'data', 'memory', 'long-term.json'),
        graphPath: path.resolve(PROJECT_ROOT, 'data', 'memory', 'knowledge-graph.json'),
        convDir: path.resolve(PROJECT_ROOT, 'data', 'conversations'),
        theoriesDir: path.resolve(PROJECT_ROOT, 'data', 'theories'),
        wsTheoriesDir: path.resolve(PROJECT_ROOT, 'workspace', 'theories'),
        learnerPath: path.resolve(PROJECT_ROOT, 'data', 'improvement', 'autonomous-learning.json'),
      },
    };
    this.systems.set('default', defaultSys);
  }

  /**
   * Load all user-created systems from disk
   */
  _loadSystems() {
    try {
      if (fs.existsSync(SYSTEMS_META_FILE)) {
        const raw = fs.readFileSync(SYSTEMS_META_FILE, 'utf8');
        const meta = JSON.parse(raw);
        if (
          meta.activeSystemId &&
          (meta.activeSystemId === 'default' ||
            fs.existsSync(path.resolve(SYSTEMS_BASE_DIR, meta.activeSystemId)))
        ) {
          this.activeSystemId = meta.activeSystemId;
        }
      }

      // Scan subdirectories in data/systems/
      const entries = fs.readdirSync(SYSTEMS_BASE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const sysFile = path.resolve(SYSTEMS_BASE_DIR, entry.name, 'system.json');
          if (fs.existsSync(sysFile)) {
            try {
              const sys = JSON.parse(fs.readFileSync(sysFile, 'utf8'));
              sys.paths = this._computeSystemPaths(sys.id);
              this.systems.set(sys.id, sys);
            } catch (e) {
              console.warn(`[SystemManager] Error loading system ${entry.name}:`, e.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[SystemManager] Registry load error:', e.message);
    }
  }

  /**
   * Compute directory and file paths for an isolated system instance
   */
  _computeSystemPaths(systemId) {
    const sysRoot = path.resolve(SYSTEMS_BASE_DIR, systemId);
    return {
      sysRoot,
      workspaceDir: path.resolve(sysRoot, 'workspace'),
      stmPath: path.resolve(sysRoot, 'memory', 'short-term.json'),
      ltmPath: path.resolve(sysRoot, 'memory', 'long-term.json'),
      graphPath: path.resolve(sysRoot, 'memory', 'knowledge-graph.json'),
      convDir: path.resolve(sysRoot, 'conversations'),
      theoriesDir: path.resolve(sysRoot, 'theories'),
      wsTheoriesDir: path.resolve(sysRoot, 'workspace', 'theories'),
      learnerPath: path.resolve(sysRoot, 'improvement', 'autonomous-learning.json'),
    };
  }

  /**
   * Save the registry metadata (which system is active)
   */
  _saveRegistry() {
    try {
      fs.writeFileSync(
        SYSTEMS_META_FILE,
        JSON.stringify(
          {
            activeSystemId: this.activeSystemId,
            updatedAt: Date.now(),
          },
          null,
          2,
        ),
      );
    } catch (e) {
      console.error('[SystemManager] Save registry error:', e.message);
    }
  }

  /**
   * Save a specific system's metadata file
   */
  _saveSystemMeta(system) {
    if (system.isDefault) return;
    try {
      const metaFile = path.resolve(system.paths.sysRoot, 'system.json');
      const toSave = {
        id: system.id,
        name: system.name,
        field: system.field,
        trainingObjective: system.trainingObjective,
        description: system.description,
        isDefault: false,
        createdAt: system.createdAt,
        lastActiveAt: system.lastActiveAt,
        trainingLevel: system.trainingLevel || 1,
        trainingSessions: system.trainingSessions || [],
      };
      fs.writeFileSync(metaFile, JSON.stringify(toSave, null, 2));
    } catch (e) {
      console.error(`[SystemManager] Save system meta error for ${system.id}:`, e.message);
    }
  }

  /**
   * Create a completely fresh, isolated SIS system for any task or field
   */
  createSystem({ name, field, trainingObjective = '', description = '' }) {
    if (!name || !name.trim()) {
      throw new Error('System name is required');
    }
    if (!field || !field.trim()) {
      throw new Error('Field of specialization is required');
    }

    const cleanName = name.trim();
    const cleanField = field.trim();
    const systemId =
      'sis-' +
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      randomUUID().slice(0, 6);
    const paths = this._computeSystemPaths(systemId);

    // 1. Initialize completely isolated, fresh directories
    fs.mkdirSync(paths.workspaceDir, { recursive: true });
    fs.mkdirSync(path.dirname(paths.stmPath), { recursive: true });
    fs.mkdirSync(paths.convDir, { recursive: true });
    fs.mkdirSync(paths.theoriesDir, { recursive: true });
    fs.mkdirSync(path.dirname(paths.learnerPath), { recursive: true });

    // 2. Initialize fresh, zero-data memory files
    fs.writeFileSync(
      paths.stmPath,
      JSON.stringify(
        {
          id: 'root',
          content: `short-term-memory-${systemId}`,
          type: 'root',
          tags: [],
          children: [],
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(
      paths.ltmPath,
      JSON.stringify(
        {
          id: 'root',
          content: `long-term-memory-${systemId}`,
          type: 'root',
          tags: [],
          children: [],
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(
      paths.graphPath,
      JSON.stringify(
        {
          nodes: [],
          edges: [],
        },
        null,
        2,
      ),
    );

    // 3. Initialize fresh autonomous learning cycle log
    fs.writeFileSync(
      paths.learnerPath,
      JSON.stringify(
        {
          totalCycles: 0,
          recentCycles: [],
          fieldFocus: cleanField,
        },
        null,
        2,
      ),
    );

    const system = {
      id: systemId,
      name: cleanName,
      field: cleanField,
      trainingObjective:
        trainingObjective.trim() ||
        `Specialized frontier reasoning and solution synthesis in ${cleanField}.`,
      description: description.trim() || `Custom dedicated SIS system trained for ${cleanField}.`,
      isDefault: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      trainingLevel: 1,
      trainingSessions: [],
      paths,
    };

    // Save system metadata
    this._saveSystemMeta(system);
    this.systems.set(systemId, system);
    this._saveRegistry();

    console.log(
      `[SystemManager] Created fresh SIS system "${cleanName}" [${cleanField}] (ID: ${systemId})`,
    );
    return system;
  }

  /**
   * Get the currently active SIS system
   */
  getActiveSystem() {
    return this.systems.get(this.activeSystemId) || this.systems.get('default');
  }

  /**
   * Get a system by ID
   */
  getSystem(id) {
    return this.systems.get(id) || null;
  }

  /**
   * List all SIS systems with real-time stats
   */
  listSystems() {
    const list = [];
    for (const sys of this.systems.values()) {
      const stats = this._getSystemStats(sys);
      list.push({
        id: sys.id,
        name: sys.name,
        field: sys.field,
        trainingObjective: sys.trainingObjective,
        description: sys.description,
        isDefault: Boolean(sys.isDefault),
        isActive: sys.id === this.activeSystemId,
        createdAt: sys.createdAt,
        lastActiveAt: sys.lastActiveAt,
        trainingLevel: sys.trainingLevel || 1,
        stats,
      });
    }

    // Sort active first, then default, then most recently active
    return list.sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return (b.lastActiveAt || 0) - (a.lastActiveAt || 0);
    });
  }

  /**
   * Calculate live statistics for an SIS system
   */
  _getSystemStats(system) {
    let workspaceFileCount = 0;
    let theoryCount = 0;
    let memoryNodeCount = 0;
    let knowledgeNodeCount = 0;
    let conversationCount = 0;
    let learningCycles = 0;

    try {
      if (fs.existsSync(system.paths.workspaceDir)) {
        const entries = fs.readdirSync(system.paths.workspaceDir, { withFileTypes: true });
        workspaceFileCount = entries.filter((e) => !e.name.startsWith('.') && e.isFile()).length;
      }
      if (fs.existsSync(system.paths.wsTheoriesDir)) {
        theoryCount = fs
          .readdirSync(system.paths.wsTheoriesDir)
          .filter((f) => f.endsWith('.md')).length;
      }
      if (fs.existsSync(system.paths.ltmPath)) {
        const raw = fs.readFileSync(system.paths.ltmPath, 'utf8');
        const data = JSON.parse(raw);
        memoryNodeCount = this._countMemoryNodes(data.root || data);
      }
      if (fs.existsSync(system.paths.graphPath)) {
        const raw = fs.readFileSync(system.paths.graphPath, 'utf8');
        const data = JSON.parse(raw);
        knowledgeNodeCount = (data.nodes || []).length;
      }
      if (fs.existsSync(system.paths.convDir)) {
        conversationCount = fs
          .readdirSync(system.paths.convDir)
          .filter((f) => f.endsWith('.json')).length;
      }
      if (fs.existsSync(system.paths.learnerPath)) {
        const raw = fs.readFileSync(system.paths.learnerPath, 'utf8');
        const data = JSON.parse(raw);
        learningCycles = data.totalCycles || (data.recentCycles || []).length || 0;
      }
    } catch {}

    return {
      workspaceFileCount,
      theoryCount,
      memoryNodeCount,
      knowledgeNodeCount,
      conversationCount,
      learningCycles,
    };
  }

  _countMemoryNodes(node) {
    if (!node) return 0;
    let count = node.type !== 'root' && node.type !== 'category' && node.content ? 1 : 0;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this._countMemoryNodes(child);
      }
    } else if (node.children && typeof node.children === 'object') {
      for (const child of Object.values(node.children)) {
        count += this._countMemoryNodes(child);
      }
    }
    return count;
  }

  /**
   * Hot-swap between SIS systems
   */
  switchSystem(systemId) {
    const target = this.systems.get(systemId);
    if (!target) {
      throw new Error(`SIS system "${systemId}" not found`);
    }

    this.activeSystemId = systemId;
    target.lastActiveAt = Date.now();
    this._saveSystemMeta(target);
    this._saveRegistry();

    // Re-target runtime singletons if bound
    if (this._subsystems) {
      const {
        workspace,
        shortTermMemory,
        longTermMemory,
        knowledgeGraph,
        conversations,
        autonomousLearner,
        brain,
      } = this._subsystems;

      if (workspace && workspace.setWorkspaceDir) {
        workspace.setWorkspaceDir(target.paths.workspaceDir);
      }
      if (shortTermMemory && shortTermMemory.setStoragePath) {
        shortTermMemory.setStoragePath(target.paths.stmPath);
      }
      if (longTermMemory && longTermMemory.setStoragePath) {
        longTermMemory.setStoragePath(target.paths.ltmPath);
      }
      if (knowledgeGraph && knowledgeGraph.setStoragePath) {
        knowledgeGraph.setStoragePath(target.paths.graphPath);
      }
      if (conversations && conversations.setStorageDir) {
        conversations.setStorageDir(target.paths.convDir);
      }
      if (autonomousLearner && autonomousLearner.setSystemContext) {
        autonomousLearner.setSystemContext(target);
      }
      if (brain) {
        brain.activeConversationId = null;
        brain.conversationHistory = [];
        brain.broadcast('system-switched', {
          systemId: target.id,
          name: target.name,
          field: target.field,
          trainingObjective: target.trainingObjective,
          stats: this._getSystemStats(target),
        });
      }
    }

    console.log(
      `[SystemManager] Switched active system to "${target.name}" [${target.field}] (${target.id})`,
    );
    return target;
  }

  /**
   * Delete a custom SIS system (default system is protected)
   */
  deleteSystem(systemId) {
    if (systemId === 'default') {
      throw new Error('The default SIS // MK-10 system cannot be deleted');
    }

    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`SIS system "${systemId}" not found`);
    }

    // If deleting active system, fall back to default first
    if (this.activeSystemId === systemId) {
      this.switchSystem('default');
    }

    this.systems.delete(systemId);

    // Delete instance directory from disk
    try {
      if (fs.existsSync(system.paths.sysRoot)) {
        fs.rmSync(system.paths.sysRoot, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`[SystemManager] Error deleting files for system ${systemId}:`, e.message);
    }

    this._saveRegistry();
    console.log(`[SystemManager] Deleted system "${system.name}" (${systemId})`);
    return { success: true, deletedId: systemId };
  }

  /**
   * Train an SIS system on a specific task, curriculum, or field
   */
  async trainSystem(
    systemId,
    { curriculum = '', topic = '', instructions = '', triggerCycle = false },
  ) {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`SIS system "${systemId}" not found`);
    }

    const trainingSession = {
      timestamp: Date.now(),
      topic: topic.trim() || system.field,
      curriculum: curriculum.trim(),
      instructions: instructions.trim(),
    };

    // If the system being trained is not active, switch to it or apply directly to its storage
    const isActive = this.activeSystemId === systemId;

    if (this._subsystems && isActive) {
      const { longTermMemory, knowledgeGraph, autonomousLearner } = this._subsystems;

      // 1. Store structured curriculum in LTM
      if (curriculum) {
        longTermMemory.store(
          ['training', system.field.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
          {
            content: `[CURRICULUM INJECTION] Field: ${system.field}. Topic: ${trainingSession.topic}.\nCurriculum:\n${curriculum}\n\nInstructions:\n${instructions}`,
            type: 'training-curriculum',
            tags: ['curriculum', system.field, trainingSession.topic].filter(Boolean),
            metadata: { systemId, trainedAt: Date.now() },
          },
          'user-trainer',
        );
      }

      // 2. Add associative concept nodes to Knowledge Graph
      if (knowledgeGraph && trainingSession.topic) {
        const entityId = `field:${systemId}:${trainingSession.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        knowledgeGraph.addNode(entityId, trainingSession.topic, 'domain-specialty', [system.field]);
      }

      // 3. Trigger targeted empirical learning cycle for this field if requested
      if (triggerCycle && autonomousLearner) {
        try {
          autonomousLearner
            .runCycle({ forceTopic: trainingSession.topic, forceDomain: system.field })
            .catch((err) => {
              console.warn('[SystemManager] Background training cycle notice:', err.message);
            });
        } catch (e) {
          console.warn('[SystemManager] Could not trigger cycle:', e.message);
        }
      }
    }

    system.trainingLevel = (system.trainingLevel || 1) + 1;
    system.trainingSessions = system.trainingSessions || [];
    system.trainingSessions.push(trainingSession);
    system.lastActiveAt = Date.now();
    this._saveSystemMeta(system);

    return {
      success: true,
      systemId,
      trainingLevel: system.trainingLevel,
      session: trainingSession,
      stats: this._getSystemStats(system),
    };
  }
}

const systemManager = new SystemManager();
export default systemManager;
