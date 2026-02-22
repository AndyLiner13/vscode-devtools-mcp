/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const DEVTOOLS_IGNORE_FILENAME = '.devtoolsignore';

export interface IgnoreContext {
  rootDir: string;
  ignoreFilePath: string;
  ignoreFileExists: boolean;
  /** Active glob patterns (non-comment, non-blank lines). */
  activePatterns: string[];
}

/**
 * Read the `.devtoolsignore` file from a given root directory.
 * Parses the `# global` / `# tools` / `## tool_name` section syntax.
 * Returns only the active glob patterns (with their section context).
 */
export function readIgnoreContext(rootDir: string): IgnoreContext {
  const ignoreFilePath = join(rootDir, DEVTOOLS_IGNORE_FILENAME);
  const ignoreFileExists = existsSync(ignoreFilePath);

  const activePatterns: string[] = [];
  if (ignoreFileExists) {
    try {
      const contents = readFileSync(ignoreFilePath, 'utf8');
      let section: 'preamble' | 'global' | 'tool' = 'preamble';
      let currentTool: string | null = null;

      for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith('#')) {
          const sectionName = line.slice(1).trim();
          if (sectionName.toLowerCase() === 'global') {
            section = 'global';
            currentTool = null;
          } else if (sectionName.toLowerCase().startsWith('tool:')) {
            const toolName = sectionName.slice(5).trim();
            if (toolName) {
              section = 'tool';
              currentTool = toolName;
            }
          }
          continue;
        }

        if (section === 'preamble') continue;

        if (section === 'global') {
          activePatterns.push(line);
        } else if (currentTool) {
          activePatterns.push(`[${currentTool}] ${line}`);
        }
      }
    } catch {
      // File exists but couldn't be read — treat as empty
    }
  }

  return {rootDir, ignoreFilePath, ignoreFileExists, activePatterns};
}

/**
 * Build an "ignoredBy" object for JSON output when results are empty.
 */
export function buildIgnoreContextJson(rootDir: string): IgnoreContext {
  return readIgnoreContext(rootDir);
}
