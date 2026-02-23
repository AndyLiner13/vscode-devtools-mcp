/**
 * Custom Logpare Strategy for VS Code Logs
 *
 * Extends logpare's default pattern recognizers with VS Code-specific patterns.
 * The defaults already wildcardize timestamps, UUIDs, IPs, URLs, numbers, file paths.
 * We add patterns for extension IDs, semantic versions, process/thread IDs,
 * memory sizes, and VS Code log session timestamps.
 *
 * What gets wildcardized (replaced with <*>):
 *   - Extension IDs: TypeScriptTeam.native-preview
 *   - Semantic versions: v1.96.0, 22.13.1-beta.1
 *   - Process/thread IDs: PID:12345, Worker #3
 *   - Memory sizes: 128MB, 1.5GB
 *   - VS Code log session timestamps: 20260221T211915
 *
 * What is preserved as meaningful tokens:
 *   - HTTP methods (GET, POST, DELETE)
 *   - Log levels/severity ([info], [error], [warning])
 *   - Channel names
 *   - Tool names (file.highlightReadRange, checkForChanges)
 */

import { DEFAULT_PATTERNS, defineStrategy } from 'logpare';

export const /**
	 *
	 */
	VS_CODE_PATTERNS: Record<string, RegExp> = {
		...DEFAULT_PATTERNS,

		// VS Code extension IDs: publisher.extensionName (e.g. ms-python.python)
		extensionId: /\b[a-zA-Z][\w-]*\.[a-zA-Z][\w-]*/,

		// Semantic versions: 1.96.0, v22.13.1-beta.1
		semver: /\bv?\d+\.\d+\.\d+(-[\w.]+)?\b/,

		// Process/thread IDs: PID:12345, Worker #3, Thread-12
		processId: /\b(?:PID|pid|Worker|Thread)[\s:#-]*\d+\b/,

		// Memory sizes: 128MB, 1.5GB, 4096KB
		memorySize: /\b\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB|bytes?)\b/i,

		// VS Code log session timestamps: 20260221T211915
		logSessionId: /\b\d{8}T\d{6}\b/
	};

/**
 * Custom parsing strategy for VS Code logs.
 * Pass to logpare's compress/createDrain via `drain.preprocessing`.
 */
export const /**
	 *
	 */
	vsCodeStrategy = defineStrategy({
		patterns: VS_CODE_PATTERNS
	});
