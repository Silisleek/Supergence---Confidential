import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MASCOTS = Object.freeze(
  [
    { id: 'superake', name: 'Superake', color: '#6579dc' },
    { id: 'supermull', name: 'Supermull', color: '#b974a0' },
    { id: 'supersion', name: 'Supersion', color: '#d96480' },
    { id: 'superbold', name: 'Superbold', color: '#dfc18e' },
    { id: 'superbit', name: 'Superbit', color: '#afc3a7' },
  ].map((mascot) => Object.freeze({ ...mascot, src: `/images/mascots/${mascot.id}.png` })),
);

const DEFAULTS = Object.freeze({
  'agent-biology': ['Superbit', 'superbit'],
  'agent-mathematics': ['Superbold', 'superbold'],
  'agent-cs': ['Superake', 'superake'],
  'agent-ee': ['Supersion', 'supersion'],
  'agent-data-ai': ['Supermull', 'supermull'],
  'agent-cybernetics': ['Superlink', 'superake'],
  'agent-economics': ['Superquant', 'superbold'],
  'agent-dialectics': ['Supersynth', 'supermull'],
});

/** Presentation preferences only. The real roster remains owned by AgentTeamManager. */
export class AgentProfiles {
  constructor({
    directory = path.join(process.env.SIS_DATA_DIR || path.join(root, 'data'), 'agent-profiles'),
  } = {}) {
    this.file = path.join(directory, 'profiles.json');
    this.overrides = null;
  }

  load() {
    if (this.overrides) return;
    this.overrides = Object.create(null);
    if (!fs.existsSync(this.file)) return;
    const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error('Agent profiles storage is invalid.');
    for (const [id, profile] of Object.entries(data)) {
      if (profile && typeof profile === 'object') this.overrides[id] = this.validate(profile);
    }
  }

  validate(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch))
      throw new Error('Profile must be an object.');
    const result = {};
    if (Object.hasOwn(patch, 'name')) {
      if (typeof patch.name !== 'string') throw new Error('Name must be text.');
      const name = patch.name.trim();
      if (!name || name.length > 64 || /[\p{Cc}\p{Cf}<>]/u.test(name))
        throw new Error('Choose a name of 1–64 characters without markup or control characters.');
      result.name = name;
    }
    if (Object.hasOwn(patch, 'mascot')) {
      if (!MASCOTS.some((item) => item.id === patch.mascot))
        throw new Error('Choose an available mascot.');
      result.mascot = patch.mascot;
    }
    return result;
  }

  decorate(agent) {
    if (!agent || typeof agent.id !== 'string') return agent;
    this.load();
    const defaults = DEFAULTS[agent.id];
    const override = this.overrides[agent.id] || {};
    const mascot =
      MASCOTS.find((item) => item.id === (override.mascot || defaults?.[1])) || MASCOTS[0];
    return {
      ...agent,
      name: override.name || defaults?.[0] || agent.name,
      specialtyName: agent.specialtyName || agent.name,
      mascot: mascot.id,
      mascotSrc: mascot.src,
      mascotColor: mascot.color,
    };
  }

  list(agents) {
    return agents.map((agent) => this.decorate(agent));
  }

  update(id, patch, agents) {
    const agent = agents.find((item) => item.id === id);
    if (!agent) throw new Error('Agent not found in the active roster.');
    this.load();
    const validated = this.validate(patch);
    if (!Object.keys(validated).length) throw new Error('Supply a name or mascot to update.');
    const next = { ...this.overrides, [id]: { ...this.overrides[id], ...validated } };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(temporary, this.file);
    this.overrides = next;
    return this.decorate(agent);
  }
}

export default new AgentProfiles();
