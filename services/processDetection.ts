/**
 * Process State Detection Utilities
 *
 * Terminal output cleaning and status types for SingleTerminalController.
 *
 * Input detection is event-driven via VS Code shell integration:
 * execution started (onDidStartTerminalShellExecution) + output stream idle
 * signals the process is waiting for user input — no regex pattern matching needed.
 */

export type TerminalStatus =
  | 'completed'
  | 'idle'
  | 'running'
  | 'timeout'
  | 'waiting_for_input';

/**
 * Clean ANSI escape sequences and control characters from terminal output.
 *
 * Strips CSI, OSC, DCS sequences, handles carriage-return overwriting,
 * normalises CRLF, and removes non-printable control characters.
 */
export function cleanTerminalOutput(raw: string): string {
  // CSI sequences: ESC [ <params> <intermediate> <final byte>
  let text = raw.replaceAll(/\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g, '');
  // OSC sequences: ESC ] ... (BEL | ST)
  text = text.replaceAll(/\x1b][\s\S]*?(?:\x07|\x1b\\|\x9c)/g, '');
  // DCS/PM/APC/SOS sequences
  text = text.replaceAll(/\x1b[P^_X][\s\S]*?(?:\x1b\\|\x9c)/g, '');
  // Two-character ESC sequences
  text = text.replaceAll(/\x1b[\x20-\x7e]/g, '');

  // Normalise CRLF → LF
  text = text.replaceAll('\r\n', '\n');

  // Simulate carriage-return overwriting
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('\r')) continue;
    const segments = line.split('\r');
    const chars: string[] = [];
    for (const seg of segments) {
      if (seg === '') continue;
      for (let c = 0; c < seg.length; c++) {
        chars[c] = seg[c];
      }
    }
    lines[i] = chars.join('');
  }
  text = lines.join('\n');

  // Strip remaining non-printable control characters (keep \n and \t)
  text = text.replaceAll(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

  // Collapse runs of 3+ blank lines into 2
  text = text.replaceAll(/\n{3,}/g, '\n\n');

  return text.trim();
}
