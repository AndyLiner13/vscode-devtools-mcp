/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {import('prettier').Config}
 */
module.exports = {
  printWidth: 256,
  tabWidth: 2,
  useTabs: true,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  bracketSameLine: true,
  arrowParens: 'always',
  singleAttributePerLine: true,
  htmlWhitespaceSensitivity: 'css',
  endOfLine: 'crlf',
  plugins: ['prettier-plugin-packagejson'],
};
