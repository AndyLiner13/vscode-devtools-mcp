/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ToolDefinition} from './ToolDefinition.js';

import * as codebaseTools from './codebase/index.js';
import * as fileTools from './file/index.js';

const tools = [
  ...Object.values(codebaseTools),
  ...Object.values(fileTools),
] as unknown as ToolDefinition[];

tools.sort((a, b) => {
  return a.name.localeCompare(b.name);
});

export {tools};
