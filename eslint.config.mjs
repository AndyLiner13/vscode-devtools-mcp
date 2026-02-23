/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import noSecrets from 'eslint-plugin-no-secrets';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
import {defineConfig, globalIgnores} from 'eslint/config';
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
    extends: ['js/recommended'],
    languageOptions: {
      ecmaVersion: 'latest',
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
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    plugins: {
      '@stylistic': stylisticPlugin,
      '@typescript-eslint': tseslint.plugin,
      js: eslint,
      jsdoc,
      'no-secrets': noSecrets,
      perfectionist,
      promise,
      unicorn,
    },
  },
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    name: 'Shared TypeScript rules',
    rules: {
      // ===== Existing Rules =====
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/semi': 'error',
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array-simple',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': [
        'error',
        {
          ignoreRestArgs: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      curly: ['error', 'all'],
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'perfectionist/sort-enums': [
        'error',
        {
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            'type',
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
          ignoreCase: true,
          newlinesBetween: 'always',
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          order: 'asc',
          partitionByComment: true,
          type: 'natural',
        },
      ],
      'perfectionist/sort-union-types': [
        'error',
        {
          order: 'asc',
          type: 'natural',
        },
      ],

      // ===== Core JS Best Practices =====
      complexity: ['warn', 20],
      eqeqeq: ['error', 'always'],
      'max-depth': ['warn', 4],
      'no-else-return': 'error',
      'no-eval': 'error',
      'no-nested-ternary': 'error',
      'no-param-reassign': ['error', {props: false}],
      'no-restricted-syntax': [
        'error',
        {
          message:
            'Use process.stdout.write() or process.stderr.write() for standard I/O logging instead of console methods.',
          selector: 'CallExpression[callee.object.name="console"]',
        },
        {
          message:
            'for-in loops are banned. Use for-of with Object.keys() or Object.entries() instead.',
          selector: 'ForInStatement',
        },
      ],
      'no-throw-literal': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': [
        'error',
        {
          AssignmentExpression: {array: false, object: false},
          VariableDeclarator: {array: false, object: true},
        },
      ],
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',

      // ===== TypeScript Type-Checked Rules =====
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // ===== TypeScript Strict & Style Rules =====
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          selector: 'default',
          trailingUnderscore: 'allow',
        },
        {
          format: ['camelCase', 'PascalCase'],
          selector: 'import',
        },
        {
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          selector: 'variable',
          trailingUnderscore: 'allow',
        },
        {
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          modifiers: ['const', 'exported'],
          selector: 'variable',
        },
        {
          format: ['camelCase', 'PascalCase'],
          selector: 'function',
        },
        {
          format: ['PascalCase'],
          selector: 'typeLike',
        },
        {
          format: ['PascalCase'],
          selector: 'enumMember',
        },
        {
          format: null,
          selector: 'property',
        },
        {
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          selector: 'parameter',
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'error',

      // ===== Unicorn Plugin Rules =====
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: ['^index\\.ts$', '^index\\.js$'],
        },
      ],
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-string-replace-all': 'error',

      // ===== Promise Plugin Rules =====
      'promise/no-multiple-resolved': 'error',
      'promise/no-nesting': 'error',
      'promise/prefer-await-to-then': 'error',

      // ===== Secret Detection =====
      'no-secrets/no-secrets': 'error',

      // ===== JSDoc for Exported Constants =====
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type!="ArrowFunctionExpression"][init.type!="FunctionExpression"]',
          ],
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: false,
            FunctionDeclaration: false,
            FunctionExpression: false,
            MethodDefinition: false,
          },
        },
      ],
    },
  },
  {
    files: ['mcp-server/**/*.ts', 'mcp-server/**/*.js', 'mcp-server/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    name: 'MCP server rules',
    plugins: {
      '@local': localPlugin,
    },
    rules: {
      '@local/check-license': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              message:
                'Import only the devtools-frontend code exported via node_modules/chrome-devtools-frontend/mcp/mcp.js',
              regex: '.*chrome-devtools-frontend/(?!mcp/mcp.js$).*',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    name: 'Tests',
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    name: 'JavaScript files',
  },
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
]);
