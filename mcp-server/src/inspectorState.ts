/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Inspector HTTP Server State
 *
 * Holds the dynamically assigned port for the Inspector HTTP endpoint.
 * Separated into its own module to avoid circular dependencies between
 * main.ts and LifecycleService.ts.
 */

let inspectorHttpPort: number | undefined;

/**
 * Set the Inspector HTTP port. Called by main.ts after the HTTP server starts.
 */
export function setInspectorHttpPort(port: number): void {
	inspectorHttpPort = port;
}

/**
 * Get the current Inspector HTTP port, or undefined if not started yet.
 */
export function getInspectorHttpPort(): number | undefined {
	return inspectorHttpPort;
}
