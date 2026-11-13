import superbox from '../services/superbox.js';

export const superboxTools = {
  superbox_create_file: {
    name: 'superbox_create_file',
    description: 'Create or overwrite a regular file in the shared Superbox staging folder.',
    parameters: {
      path: {
        type: 'string',
        description:
          'Relative path of the file to create inside Superbox (e.g. "test.js", "app/main.py").',
      },
      content: {
        type: 'string',
        description: 'Text content to write into the file.',
      },
    },
    required: ['path', 'content'],
    execute: async (args = {}) => {
      const { path: relPath, content = '' } = args;
      return superbox.createFile(relPath, content);
    },
  },

  superbox_read_file: {
    name: 'superbox_read_file',
    description: 'Read a regular file in the Superbox staging folder.',
    parameters: {
      path: {
        type: 'string',
        description: 'Relative path of the file to read inside Superbox.',
      },
    },
    required: ['path'],
    execute: async (args = {}) => {
      const { path: relPath } = args;
      return superbox.readFile(relPath);
    },
  },

  superbox_list_files: {
    name: 'superbox_list_files',
    description: 'List files and folders in the Superbox staging folder.',
    parameters: {
      subDir: {
        type: 'string',
        description: 'Optional sub-directory inside Superbox to list (defaults to root).',
      },
    },
    required: [],
    execute: async (args = {}) => {
      const { subDir = '' } = args;
      const files = superbox.listFiles(subDir);
      const status = superbox.getStatus();
      return {
        success: true,
        files,
        totalFiles: files.length,
        status,
      };
    },
  },

  superbox_run_command: {
    name: 'superbox_run_command',
    description:
      'Run an authorized host shell command with the Superbox staging folder as its working directory. The command has normal host filesystem access.',
    parameters: {
      command: {
        type: 'string',
        description: 'Shell command to start from the Superbox staging folder.',
      },
      timeoutMs: {
        type: 'number',
        description: 'Optional execution timeout in milliseconds (default: 20000).',
      },
    },
    required: ['command'],
    execute: async (args = {}) => {
      const { command, timeoutMs = 20000 } = args;
      return await superbox.runCommand(command, { timeoutMs });
    },
  },

  superbox_apply_to_workspace: {
    name: 'superbox_apply_to_workspace',
    description:
      'Copy staged files into the workspace. The copy fails if a destination file already exists.',
    parameters: {
      filePaths: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional array of specific file paths to copy. If omitted, copies all non-directory files.',
      },
      targetDir: {
        type: 'string',
        description: 'Optional target subfolder in the workspace (default: workspace root).',
      },
    },
    required: [],
    execute: async (args = {}) => {
      const { filePaths = null, targetDir = '' } = args;
      return superbox.applyToWorkspace(filePaths, targetDir);
    },
  },

  superbox_reset: {
    name: 'superbox_reset',
    description: 'Delete the files and folders in Superbox staging.',
    parameters: {},
    required: [],
    execute: async () => {
      return superbox.reset();
    },
  },
};

export default superboxTools;
