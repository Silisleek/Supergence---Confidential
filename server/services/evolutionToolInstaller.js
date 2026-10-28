import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { confined } from './evolutionEngine.js';

export function configureEvolutionTools(engine, registry) {
  engine.installTool = async (p) => {
    if (
      !p.toolEntry ||
      !p.files.every(
        (file) => fs.readFileSync(confined(engine.root, file.path), 'utf8') === file.content,
      )
    )
      throw new Error('Approved tool files failed integrity verification.');
    const entry = p.files.find((file) => file.path === p.toolEntry);
    const digest = createHash('sha256').update(entry.content).digest('hex');
    const module = await import(
      `${pathToFileURL(confined(engine.root, p.toolEntry)).href}?revision=${digest}`
    );
    const tool = module.default;
    if (
      !tool ||
      !/^[a-z][a-z0-9_]{2,80}$/.test(tool.name) ||
      typeof tool.description !== 'string' ||
      typeof tool.execute !== 'function' ||
      !tool.parameters ||
      typeof tool.parameters !== 'object'
    )
      throw new Error('Tool must export default {name, description, parameters, execute}.');
    const existing = registry.get(tool.name);
    if (existing && existing.evolutionProposalId !== p.id)
      throw new Error('An approved extension cannot replace an existing tool.');
    registry.register({
      ...tool,
      verified: true,
      isDynamicCustom: true,
      evolutionProposalId: p.id,
      approvedAt: p.appliedAt || new Date().toISOString(),
    });
    p.runtimeStatus = 'active';
    delete p.runtimeError;
    return { name: tool.name };
  };
  engine.removeTool = (p) => {
    for (const tool of registry.getAll())
      if (tool.evolutionProposalId === p.id) registry.unregister(tool.name);
  };
  return async () => {
    for (const p of engine.state.proposals.filter((p) => p.status === 'applied' && p.toolEntry)) {
      try {
        await engine.installTool(p);
      } catch (error) {
        engine.removeTool(p);
        p.runtimeStatus = 'quarantined';
        p.runtimeError = 'Approved tool files changed or failed to load.';
        engine.save();
        engine.monitor.record(
          'evolution_tool_restore',
          'quarantined',
          { risk: 'high', findings: ['Approved tool files changed or failed to load.'] },
          { proposalId: p.id },
        );
        console.warn('[Evolution] Tool quarantined:', p.title, error.message);
      }
    }
  };
}
