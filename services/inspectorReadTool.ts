/**
 * Language Model Tool: inspector_read
 *
 * Gives Copilot read access to MCP Inspector flagged test records.
 * Only surfaces records that are flagged (thumbs-down) AND fresh
 * (not stale from a pending hot reload).
 *
 * Two modes:
 *   1. List mode (toolName only): Returns flagged, non-stale record IDs + comments
 *   2. Detail mode (toolName + recordId): Returns full input/output for one record
 */

import * as vscode from 'vscode';

const INSPECTOR_BASE_URL = 'http://localhost:6275';

// ── Input Schema ─────────────────────────────────────────────────────────────

interface IInspectorReadParams {
  toolName: string;
  recordId?: string;
}

// ── API Types ────────────────────────────────────────────────────────────────

interface InspectorRecord {
  id: string;
  toolName: string;
  input: string;
  output: Array<{ type: string; text?: string }>;
  isError: boolean;
  createdAt: string;
  lastRunAt: string | null;
  rating: string | null;
  comment: string;
  priority: number;
  durationMs: number;
  isStale: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchInspectorRecords(toolName: string): Promise<InspectorRecord[]> {
  const url = `${INSPECTOR_BASE_URL}/api/records?tool=${encodeURIComponent(toolName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Inspector API returned ${res.status}`);
  }
  return res.json() as Promise<InspectorRecord[]>;
}

async function fetchInspectorRecord(recordId: string): Promise<InspectorRecord | null> {
  const url = `${INSPECTOR_BASE_URL}/api/records/${encodeURIComponent(recordId)}`;
  const res = await fetch(url);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Inspector API returned ${res.status}`);
  }
  return res.json() as Promise<InspectorRecord>;
}

function combineOutputText(blocks: Array<{ type: string; text?: string }>): string {
  return blocks
    .filter(b => b.text)
    .map(b => b.text)
    .join('\n');
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function textResult(text: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(text),
  ]);
}

// ── LM Tool ──────────────────────────────────────────────────────────────────

export class InspectorReadTool implements vscode.LanguageModelTool<IInspectorReadParams> {

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<IInspectorReadParams>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation | undefined> {
    const { toolName, recordId } = options.input;

    if (recordId) {
      return {
        invocationMessage: `Reading inspector record ${recordId} for tool "${toolName}"`,
      };
    }

    return {
      invocationMessage: `Listing flagged inspector issues for tool "${toolName}"`,
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<IInspectorReadParams>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { toolName, recordId } = options.input;

    try {
      if (recordId) {
        return await this.getRecordDetail(toolName, recordId);
      }
      return await this.listFlaggedRecords(toolName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
        return textResult(
          'Inspector is not running. Start it with `npm run dev` in the inspector/ directory.',
        );
      }

      return textResult(`Error reading inspector records: ${message}`);
    }
  }

  private async listFlaggedRecords(toolName: string): Promise<vscode.LanguageModelToolResult> {
    const records = await fetchInspectorRecords(toolName);

    // Only flagged (thumbs-down) and fresh (not stale) records
    const flagged = records
      .filter(r => r.rating === 'bad' && !r.isStale)
      .sort((a, b) => a.priority - b.priority);

    if (flagged.length === 0) {
      return textResult(
        `No flagged issues found for tool "${toolName}".\n\n` +
        'Either there are no thumbs-down records, or all flagged records are stale ' +
        '(code has changed since they were last run — they need to be re-executed in the Inspector first).',
      );
    }

    const lines: string[] = [
      `## Flagged Issues for tool: ${toolName}\n`,
      `${flagged.length} flagged item(s) ready for review:\n`,
      '| # | Record ID | Description | Status | Last Run | Duration |',
      '|---|-----------|-------------|--------|----------|----------|',
    ];

    for (let i = 0; i < flagged.length; i++) {
      const r = flagged[i];
      const description = r.comment || '_(no description)_';
      const status = r.isError ? '❌ Error' : '⚠️ Flagged';
      const lastRun = formatTime(r.lastRunAt ?? r.createdAt);
      const duration = `${r.durationMs}ms`;

      lines.push(`| ${i + 1} | \`${r.id}\` | ${description} | ${status} | ${lastRun} | ${duration} |`);
    }

    lines.push(
      '',
      'To see the full input and output for a specific issue, call `inspector_read` again with the `recordId` parameter set to the Record ID from the table above.',
    );

    return textResult(lines.join('\n'));
  }

  private async getRecordDetail(
    toolName: string,
    recordId: string,
  ): Promise<vscode.LanguageModelToolResult> {
    const record = await fetchInspectorRecord(recordId);

    if (!record) {
      return textResult(`Record "${recordId}" not found for tool "${toolName}".`);
    }

    if (record.toolName !== toolName) {
      return textResult(
        `Record "${recordId}" belongs to tool "${record.toolName}", not "${toolName}".`,
      );
    }

    const outputText = combineOutputText(record.output);
    const lastRun = formatTime(record.lastRunAt ?? record.createdAt);

    const lines: string[] = [
      `## Flagged Issue: ${recordId}\n`,
      `**Tool:** ${record.toolName}`,
      `**Description:** ${record.comment || '_(no description)_'}`,
      `**Status:** ${record.isError ? '❌ Error' : '⚠️ Flagged'}`,
      `**Stale:** ${record.isStale ? 'Yes (code changed since last run)' : 'No (current)'}`,
      `**Last Run:** ${lastRun}`,
      `**Duration:** ${record.durationMs}ms`,
      '',
      '### Input',
      '```json',
      record.input || '{}',
      '```',
      '',
      '### Output',
      '```',
      outputText,
      '```',
    ];

    return textResult(lines.join('\n'));
  }
}
