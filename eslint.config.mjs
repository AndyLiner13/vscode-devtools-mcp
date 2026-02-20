/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import localPlugin from './mcp-server/scripts/eslint_rules/local-plugin.js';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/*.d.ts',
    '.devtools/**',
    'client-workspace/**',
    'test-workspace/**',
    'mcp-server/build/**',
  ]),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            'esbuild.js',
            'eslint.config.mjs',
            '.prettierrc.cjs',
            'mcp-server/rollup.config.mjs',
          ],
        },
      },
    },
    plugins: {
      js: eslint,
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylisticPlugin,
      perfectionist,
    },
    extends: ['js/recommended'],
  },
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    name: 'Shared TypeScript rules',
    rules: {
      curly: ['error', 'all'],
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array-simple',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          ignoreCase: true,
          newlinesBetween: 'always',
          groups: [
            'type',
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/semi': 'error',
    },
  },
  {
    name: 'MCP server rules',
    files: ['mcp-server/**/*.ts', 'mcp-server/**/*.js', 'mcp-server/**/*.mjs'],
    plugins: {
      '@local': localPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@local/check-license': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '.*chrome-devtools-frontend/(?!mcp/mcp.js$).*',
              message:
                'Import only the devtools-frontend code exported via node_modules/chrome-devtools-frontend/mcp/mcp.js',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'Tests',
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    name: 'JavaScript files',
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
]);
