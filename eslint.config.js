import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      'client/vendor/**',
      'references/**',
      'archives/**',
      'scratch/**',
      'data/**',
      'workspace/**',
      'dist/**',
      'release*/**',
      'Liquid-glass/**',
      'Supergencebackgrounds/**',
      'integrations/**',
    ],
  },
  {
    files: [
      'client/**/*.js',
      'server/**/*.js',
      'electron/**/*.cjs',
      'scripts/maintenance/*.mjs',
      'scripts/benchmarks/*.mjs',
      'scripts/dev.mjs',
      'scripts/build.mjs',
      'tests/unit/*.test.mjs',
      'tests/browser/*.mjs',
      '*.config.js',
    ],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off',
    },
  },
  {
    files: [
      'client/scripts/workspace-controller.js',
      'client/scripts/continuous-dock.js',
      'client/scripts/reload-guard.js',
      'client/scripts/feature-catalog.js',
      'client/scripts/feature-actions.js',
    ],
    languageOptions: { sourceType: 'script' },
  },
];
