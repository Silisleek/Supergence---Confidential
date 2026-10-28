import { evolutionEngine as engine } from '../services/evolutionEngine.js';
import { composioBridge } from '../services/composioBridge.js';

const proposalSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    rationale: { type: 'string' },
    kind: { type: 'string', enum: ['project', 'app', 'tool', 'architecture', 'rule', 'idea'] },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
    },
    tests: { type: 'array', items: { type: 'string' } },
    browser: {
      type: 'object',
      properties: {
        entry: { type: 'string' },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              text: { type: 'string' },
              click: { type: 'boolean' },
            },
            required: ['selector'],
          },
        },
      },
      required: ['entry', 'checks'],
    },
    rule: { type: 'string' },
    toolEntry: {
      type: 'string',
      description:
        'For kind=tool, included server/extensions/name.mjs exporting default {name,description,parameters,execute}.',
    },
  },
  required: ['title', 'rationale', 'kind'],
};
export const evolutionTools = {
  propose_evolution: {
    name: 'propose_evolution',
    description:
      'Stage real multi-file changes for user review. Targets: client/, server/extensions/, workspace/projects/, docs/. Include Node regression tests and an HTML preview with browser assertions for UI. No live files are changed. For rules supply kind=rule and rule. Architecture source changes outside these roots require manual review.',
    parameters: proposalSchema,
    execute: (args) => engine.create(args),
  },
  revise_evolution: {
    name: 'revise_evolution',
    description:
      'Fix a failed draft with replacement files and test plans. Invalidates previous verification; respects repair budget. Never applies the draft.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, proposal: proposalSchema },
      required: ['id', 'proposal'],
    },
    execute: ({ id, proposal }) => engine.revise(id, proposal),
  },
  inspect_evolution: {
    name: 'inspect_evolution',
    description:
      'Read staged changes, actual verification evidence, or the current proposal queue.',
    parameters: { id: 'string' },
    execute: ({ id } = {}) => (id ? engine.detail(id) : engine.snapshot()),
  },
  verify_evolution: {
    name: 'verify_evolution',
    description:
      'Run non-executing syntax/security validation. Local project tests require user consent in Evolution Studio. Read failures, revise files, and retry within budget. Passing checks never applies changes.',
    parameters: { id: 'string' },
    required: ['id'],
    execute: ({ id }) => engine.verify(id),
  },
  queue_research: {
    name: 'queue_research',
    description:
      'Queue real research in the background while continuing conversation. Requires background research enabled in Evolution settings. Results and sources are retained; inspect_research returns progress.',
    parameters: { topic: 'string' },
    required: ['topic'],
    execute: ({ topic }) => engine.queueResearch(topic),
  },
  inspect_research: {
    name: 'inspect_research',
    description: 'Read actual queued research status and retained results.',
    parameters: {},
    execute: () => ({ jobs: engine.state.jobs.slice(-10) }),
  },
  composio_discover: {
    name: 'composio_discover',
    description:
      'Fetch actual app tool schemas from the user-configured Composio session. Requires project key and connected accounts. Does not claim an unconfigured connector is usable.',
    parameters: {},
    execute: () => composioBridge.discover(),
  },
  composio_request_action: {
    name: 'composio_request_action',
    description:
      'Propose an external Composio app action for explicit user review. Discover schema first. Does not execute until the user accepts the exact arguments in Evolution Studio.',
    parameters: {
      type: 'object',
      properties: {
        tool: { type: 'string' },
        arguments: { type: 'object', additionalProperties: true },
      },
      required: ['tool', 'arguments'],
    },
    execute: (args) => composioBridge.requestAction(args),
  },
};
