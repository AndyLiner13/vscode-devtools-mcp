/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import noSecrets from 'eslint-plugin-no-secrets';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
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
    'client-workspace/**',
    'tests/**',
    'resources/**',
    'mcp-server/build/**',
  ]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
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
      unicorn,
      promise,
      jsdoc,
      'no-secrets': noSecrets,
    },
    extends: ['js/recommended'],
  },
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    name: 'Shared TypeScript rules',
    rules: {
      // ===== Existing Rules =====
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
      'perfectionist/sort-objects': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          partitionByComment: true,
        },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-union-types': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-enums': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/semi': 'error',

      // ===== Core JS Best Practices =====
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'no-eval': 'error',
      'no-throw-literal': 'error',
      'no-nested-ternary': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-else-return': 'error',
      'no-param-reassign': ['error', {props: false}],
      complexity: ['warn', 20],
      'max-depth': ['warn', 4],
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {array: false, object: true},
          AssignmentExpression: {array: false, object: false},
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="console"]',
          message:
            'Use process.stdout.write() or process.stderr.write() for standard I/O logging instead of console methods.',
        },
        {
          selector: 'ForInStatement',
          message:
            'for-in loops are banned. Use for-of with Object.keys() or Object.entries() instead.',
        },
      ],

      // ===== TypeScript Type-Checked Rules =====
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-deprecated': 'warn',

      // ===== TypeScript Strict & Style Rules =====
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          modifiers: ['const', 'exported'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'property',
          format: null,
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // ===== Unicorn Plugin Rules =====
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: ['^index\\.ts$', '^index\\.js$'],
        },
      ],

      // ===== Promise Plugin Rules =====
      'promise/prefer-await-to-then': 'error',
      'promise/no-nesting': 'error',
      'promise/no-multiple-resolved': 'error',

      // ===== Secret Detection =====
      'no-secrets/no-secrets': 'error',

      // ===== JSDoc for Exported Constants =====
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: false,
            MethodDefinition: false,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type!="ArrowFunctionExpression"][init.type!="FunctionExpression"]',
          ],
        },
      ],
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
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
]);
