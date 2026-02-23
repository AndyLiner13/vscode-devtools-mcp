/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {FilterOptions, Severity} from '@packages/log-consolidation';

import {compressLogs, EXPERIMENTAL_LOG_EXTENSIONS, LOG_FILE_EXTENSIONS} from '@packages/log-consolidation';
import fs from 'node:fs';
import path from 'node:path';
import {z as zod} from 'zod';

import {getClientWorkspace} from '../../config.js';
import {ToolCategory} from '../categories.js';
import {defineTool} from '../ToolDefinition.js';

function resolveFilePath(file: string): string {
  if (path.isAbsolute(file)) {
    return file;
  }
  return path.resolve(getClientWorkspace(), file);
}

/**
 * All extensions supported by the log file reader.
 * Includes both definitive log extensions and experimental ones (.txt, .csv).
 */
export function isLogCompatible(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return LOG_FILE_EXTENSIONS.has(ext) || EXPERIMENTAL_LOG_EXTENSIONS.has(ext);
}

/**
 * Extensions that are strictly log-only — file_read will redirect to this tool.
 * Experimental extensions (.txt, .csv) are dual-use and handled by both tools.
 */
export function isStrictLogFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return LOG_FILE_EXTENSIONS.has(ext);
}

export const logFileRead = defineTool({
  name: 'logFile_read',
  description:
    'Read and analyze log files with automatic pattern compression and drill-down filtering.\n\n' +
    'Detects repeating patterns in log output and compresses them into a structured overview ' +
    'with severity counts, pattern tables, and drill-down capabilities.\n\n' +
    '**Supported Extensions:**\n' +
    '- Log files: `.log`, `.out`, `.err`, `.trace`, `.syslog`, `.access`, `.audit`\n' +
    '- Structured logs: `.jsonl`, `.ndjson`\n' +
    '- Diagnostic: `.dump`, `.diag`, `.debug`\n' +
    '- Experimental (auto-detected): `.txt`, `.csv`\n\n' +
    '**Parameters:**\n' +
    '- `file` (required) — Path to log file (relative or absolute)\n' +
    '- `templateId` — Expand a specific pattern from the overview\n' +
    '- `severity` — Filter by error, warning, or info\n' +
    '- `timeRange` — Filter by time window (HH:MM-HH:MM)\n' +
    '- `pattern` — Regex filter on raw content\n' +
    '- `minDuration` — Show slow operations (e.g. "1s", "500ms")\n' +
    '- `correlationId` — Trace a specific request UUID\n' +
    '- `includeStackFrames` — Show/hide stack frames (default: true)\n\n' +
    '**EXAMPLES:**\n' +
    '- Overview: `{ file: "server.log" }`\n' +
    '- Errors only: `{ file: "server.log", severity: "error" }`\n' +
    '- Drill into pattern: `{ file: "server.log", templateId: "t003" }`\n' +
    '- Search: `{ file: "app.log", pattern: "timeout|connection refused" }`\n' +
    '- Slow ops: `{ file: "perf.log", minDuration: "1s" }`\n' +
    '- Trace request: `{ file: "api.log", correlationId: "abc-123" }`',
  annotations: {
    title: 'Log File Read',
    category: ToolCategory.CODEBASE_ANALYSIS,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    conditions: ['client-pipe'],
  },
  schema: {
    file: zod.string().describe('Path to log file (relative to workspace root or absolute).'),
    templateId: zod.string().optional().describe(
      'Show raw lines matching this template ID from the compressed log overview.',
    ),
    severity: zod.enum(['error', 'warning', 'info']).optional().describe(
      'Filter compressed logs by severity level.',
    ),
    timeRange: zod.string().optional().describe(
      'Time window filter for compressed logs: \'HH:MM-HH:MM\' or \'HH:MM:SS-HH:MM:SS\'.',
    ),
    pattern: zod.string().optional().describe(
      'Regex pattern to filter log content (case-insensitive).',
    ),
    minDuration: zod.string().optional().describe(
      'Show log templates with durations >= threshold: \'1s\', \'500ms\', \'100ms\'.',
    ),
    correlationId: zod.string().optional().describe(
      'Trace a specific request by UUID/correlation ID.',
    ),
    includeStackFrames: zod.boolean().optional().describe(
      'Show/hide stack frame templates in compressed logs. Default: true.',
    ),
  },
  handler: async (request, response) => {
    const {params} = request;
    const filePath = resolveFilePath(params.file);

    if (!fs.existsSync(filePath)) {
      response.appendResponseLine(
        `**Error:** File not found: \`${filePath}\``,
      );
      if (!path.isAbsolute(params.file)) {
        response.appendResponseLine(
          `The relative path \`${params.file}\` was resolved against the workspace root. ` +
          'Use an absolute path or a path relative to the workspace root.',
        );
      }
      return;
    }

    if (!isLogCompatible(filePath)) {
      response.appendResponseLine(
        `**Error:** \`${path.basename(filePath)}\` is not a recognized log file type.\n\n` +
        'Supported extensions: `.log`, `.out`, `.err`, `.trace`, `.syslog`, `.access`, `.audit`, ' +
        '`.jsonl`, `.ndjson`, `.dump`, `.diag`, `.debug`, `.txt`, `.csv`\n\n' +
        'Use `file_read` to read non-log files.',
      );
      return;
    }

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const lines = rawContent.split('\n');

    const filters: FilterOptions = {};
    if (params.templateId) {
      filters.templateId = params.templateId;
    }
    if (params.severity) {
      filters.severity = params.severity as Severity;
    }
    if (params.timeRange) {
      filters.timeRange = params.timeRange;
    }
    if (params.pattern) {
      filters.pattern = params.pattern;
    }
    if (params.minDuration) {
      filters.minDuration = params.minDuration;
    }
    if (params.correlationId) {
      filters.correlationId = params.correlationId;
    }
    if (params.includeStackFrames !== undefined) {
      filters.includeStackFrames = params.includeStackFrames;
    }

    const hasFilters = Object.keys(filters).length > 0;
    const fileName = path.basename(filePath);

    const result = compressLogs(
      {lines, label: fileName},
      hasFilters ? filters : undefined,
    );

    response.appendResponseLine(result.formatted);
  },
});
