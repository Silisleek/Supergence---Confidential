// SIS 1.0 — Domain Specialization & Multi-System Tools
// Enables Supergence to spawn, switch, inspect, and train specialized SIS domains
// (e.g., Robotics, Silicon/VLSI Chip Design, Frontier Systems Engineering).

import systemManager from '../systems/manager.js';

export const domainSystemTools = {
  create_domain_system: {
    name: 'create_domain_system',
    description:
      'Create a completely fresh, isolated SIS domain system specialized in a new frontier field (e.g., "Robotics & Kinematics", "VLSI Chip Design", "RISC-V Microarchitecture"). Provisions isolated workspace, episodic memory, and knowledge graph.',
    parameters: {
      name: {
        type: 'string',
        description: 'Name of the specialized system (e.g. "SIS-Silicon", "SIS-Robotics").',
      },
      field: {
        type: 'string',
        description:
          'Domain or field of specialization (e.g. "Robotics & Control Systems", "Silicon EDA & Chip Design").',
      },
      trainingObjective: {
        type: 'string',
        description: 'Core objective or capabilities the system is aiming to master.',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the domain focus.',
      },
    },
    required: ['name', 'field'],
    execute: (args) => systemManager.createSystem(args || {}),
  },

  switch_domain_system: {
    name: 'switch_domain_system',
    description:
      'Switch the active Superintelligence focus to an existing specialized domain system (e.g., from General MK-10 to SIS-Silicon). Dynamically retargets workspace, short-term memory, knowledge graph, and learning pipelines.',
    parameters: {
      systemId: {
        type: 'string',
        description: 'Unique ID of the SIS system to switch to.',
      },
    },
    required: ['systemId'],
    execute: ({ systemId }) => systemManager.switchSystem(systemId),
  },

  list_domain_systems: {
    name: 'list_domain_systems',
    description:
      'List all initialized specialized domain systems in Supergence, their active training levels, field objectives, and disk paths.',
    parameters: {},
    execute: () => ({
      active: systemManager.getActiveSystem(),
      systems: systemManager.listSystems(),
    }),
  },

  train_domain_system: {
    name: 'train_domain_system',
    description:
      'Execute an empirical training curriculum and self-improvement cycle on an SIS domain system (e.g. injecting kinematics curriculum or Verilog design guidelines, advancing training level).',
    parameters: {
      systemId: {
        type: 'string',
        description: 'The ID of the SIS system to train.',
      },
      topic: {
        type: 'string',
        description:
          'Specific subject or task within the domain (e.g. "URDF Kinematics", "RISC-V ALU Design", "State Space Controllers").',
      },
      curriculum: {
        type: 'string',
        description: 'Knowledge, principles, formulas, invariants, or code patterns to inject.',
      },
      instructions: {
        type: 'string',
        description: 'Guidelines on how the system should apply this learning.',
      },
      triggerCycle: {
        type: 'boolean',
        description:
          'Whether to trigger an autonomous empirical learning cycle immediately (default false).',
      },
    },
    required: ['systemId', 'topic'],
    execute: ({ systemId, ...args }) => systemManager.trainSystem(systemId, args),
  },

  get_active_domain_system: {
    name: 'get_active_domain_system',
    description:
      'Get the currently active domain system, its current training level, field, and paths.',
    parameters: {},
    execute: () => systemManager.getActiveSystem(),
  },
};
