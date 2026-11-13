// SIS 1.0 — Tool Synthesis & Dynamic Tool Genesis
// Lets the agent autonomously synthesize, sandbox-verify, register, and execute new tools.

import adaToolForger from '../services/adaToolForger.js';

export const toolSynthesisTools = {
  synthesize_dynamic_tool: {
    name: 'synthesize_dynamic_tool',
    description:
      'Autonomously synthesize and register a new tool in Supergence. The tool code is executed and verified in an isolated container sandbox before live registration. If unprivileged and verified, it is immediately registered into the live ToolRegistry for immediate execution. Code must be the BODY of an async function receiving "params" and returning a JSON-serializable object.',
    parameters: {
      name: {
        type: 'string',
        description:
          'Unique lowercase snake_case identifier for the tool (e.g. "calculate_fibonacci_sequence", "parse_custom_telemetry").',
      },
      description: {
        type: 'string',
        description: 'Clear description of what this tool does, its inputs, and its outputs.',
      },
      code: {
        type: 'string',
        description:
          'JavaScript code body of the async function: receives "params" and returns an object.',
      },
      parameters: {
        type: 'object',
        description:
          'Map of parameter names to their types or schemas (e.g. {"n": "number", "format": "string"}).',
      },
      required: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of required parameter names.',
      },
      displayName: {
        type: 'string',
        description: 'Optional human-readable display name for the tool.',
      },
      category: {
        type: 'string',
        description:
          'Optional categorization (e.g. "Mathematics", "Text Processing", "Data Analysis").',
      },
    },
    required: ['name', 'description', 'code'],
    execute: async (args) => {
      const {
        name,
        description,
        code,
        parameters = {},
        required = [],
        displayName,
        category,
      } = args || {};
      const result = await adaToolForger.forgeTool({
        name,
        description,
        code,
        parameters,
        required,
        displayName,
        category,
        requestedBy: 'Supergence Agent',
      });
      return {
        success: result.accepted !== false,
        name: (result.tool && result.tool.name) || name,
        installed: Boolean(result.installed),
        pendingApproval: Boolean(result.pendingApproval),
        privileged: Boolean(result.tool?.privileged),
        capabilities: result.tool?.capabilities || result.classification?.capabilities || [],
        reason:
          result.reason ||
          (result.installed ? 'Tool synthesized, verified, and live in ToolRegistry' : null),
        verificationNote: result.tool?.verificationNote || null,
      };
    },
  },

  list_dynamic_tools: {
    name: 'list_dynamic_tools',
    description:
      'List all dynamically synthesized tools created by Supergence, including installed tools, pending approval proposals, and recent forging history.',
    parameters: {},
    execute: () => {
      const status = adaToolForger.getStatus();
      return {
        totalInstalled: status.totalInstalled,
        totalPending: status.totalPending,
        installedTools: status.installedTools.map((t) => ({
          name: t.name,
          displayName: t.displayName,
          category: t.category,
          capabilities: t.capabilities,
          privileged: t.privileged,
          status: t.status,
          createdAt: t.createdAt,
        })),
        pendingApproval: status.pendingApproval.map((t) => ({
          name: t.name,
          displayName: t.displayName,
          capabilities: t.capabilities,
          status: t.status,
        })),
      };
    },
  },

  execute_dynamic_tool: {
    name: 'execute_dynamic_tool',
    description:
      'Execute a previously synthesized and verified dynamic tool with custom arguments.',
    parameters: {
      toolName: {
        type: 'string',
        description: 'Name of the synthesized tool to execute.',
      },
      params: {
        type: 'object',
        description: 'Parameters to pass into the dynamic tool.',
      },
    },
    required: ['toolName'],
    execute: async ({ toolName, params = {} }) => {
      return await adaToolForger.executeInstalledTool(toolName, params);
    },
  },

  test_dynamic_tool: {
    name: 'test_dynamic_tool',
    description: 'Test a synthesized dynamic tool against sample or custom arguments.',
    parameters: {
      toolId: {
        type: 'string',
        description: 'ID or name of the synthesized tool to test.',
      },
      sampleParams: {
        type: 'object',
        description: 'Optional arguments to test with.',
      },
    },
    required: ['toolId'],
    execute: async ({ toolId, sampleParams = {} }) => {
      return await adaToolForger.testToolExecution(toolId, sampleParams);
    },
  },
};
