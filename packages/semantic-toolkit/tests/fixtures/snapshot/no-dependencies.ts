/**
 * Test fixture: snapshot/no-dependencies.ts
 *
 * A function that uses no imports, constants, or external references.
 * Verify the snapshot shows just the function itself (and file header).
 */

import { Logger } from './logger';
import { MetricsClient } from './metrics';

const DEFAULT_TIMEOUT = 5000;
const MAX_ITEMS = 100;

interface Config {
	timeout: number;
	maxItems: number;
}

/** TARGET: fibonacci — pure function with no external deps */
export function fibonacci(n: number): number {
	if (n <= 0) return 0;
	if (n === 1) return 1;

	let prev = 0;
	let curr = 1;
	for (let i = 2; i <= n; i++) {
		const next = prev + curr;
		prev = curr;
		curr = next;
	}

	return curr;
}

export function createConfig(): Config {
	return {
		timeout: DEFAULT_TIMEOUT,
		maxItems: MAX_ITEMS,
	};
}

export function logMetrics(logger: Logger, metrics: MetricsClient): void {
	logger.info('Logging metrics');
	metrics.increment('log.call');
}
