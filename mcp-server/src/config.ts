/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {dirname} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {logger} from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * VS Code launch flags that control the Extension Development Host window.
 * Flags marked "always present" are injected by the launcher and cannot be
 * overridden here (remote-debugging-port, inspect-extensions,
 * extensionDevelopmentPath, user-data-dir, target folder).
 */
export interface LaunchFlags {
  /** Open in a new window (--new-window). */
  newWindow: boolean;
  /** Disable all extensions except those in enableExtensions (--disable-extensions). */
  disableExtensions: boolean;
  /** Suppress the release-notes tab (--skip-release-notes). */
  skipReleaseNotes: boolean;
  /** Suppress the welcome tab (--skip-welcome). */
  skipWelcome: boolean;
  /** Disable GPU hardware acceleration (--disable-gpu). */
  disableGpu: boolean;
  /** Disable workspace-trust dialog (--disable-workspace-trust). */
  disableWorkspaceTrust: boolean;
  /** Enable verbose logging (--verbose). */
  verbose: boolean;
  /** Set the display language, e.g. "en" (--locale). null = OS default. */
  locale: string | null;
  /** Extension IDs to keep enabled when disableExtensions is true. */
  enableExtensions: string[];
  /** Arbitrary extra CLI flags forwarded verbatim. */
  extraArgs: string[];
}

export const DEFAULT_LAUNCH_FLAGS: LaunchFlags = {
  newWindow: true,
  disableExtensions: true,
  skipReleaseNotes: true,
  skipWelcome: true,
  disableGpu: false,
  disableWorkspaceTrust: false,
  verbose: false,
  locale: null,
  enableExtensions: [
    'vscode.typescript-language-features',
    'github.copilot-chat',
  ],
  extraArgs: [],
};

/**
 * Hot-reload configuration for automatic change detection and rebuild.
 * All fields are optional with sensible defaults.
 */
export interface HotReloadConfig {
  /** Master switch — set false to disable all hot-reload checks. Default: true */
  enabled: boolean;
  /** The MCP server ID matching package.json mcpServerDefinitionProviders. Default: 'devtools' */
  mcpServerName: string;
  /** Delay (ms) between stopping and starting MCP server during restart. Default: 2000 */
  restartDelay: number;
  /** Max wait time (ms) for mcpStatus LM tool before timeout. Default: 60000 */
  mcpStatusTimeout: number;
}

const DEFAULT_HOT_RELOAD_CONFIG: HotReloadConfig = {
  enabled: true,
  mcpServerName: 'devtools',
  restartDelay: 2000,
  mcpStatusTimeout: 60_000,
};

/**
 * Client configuration — runtime behavior of the client VS Code window.
 */
export interface ClientConfig {
  /** Enable diagnostic tools (debug_evaluate) */
  devDiagnostic?: boolean;

  /** Run VS Code headless (Linux only) */
  headless?: boolean;

  /** Enable experimental vision tools */
  experimentalVision?: boolean;

  /** Enable experimental structured content output */
  experimentalStructuredContent?: boolean;

  /** VS Code launch flags for the client VS Code window */
  launch?: Partial<LaunchFlags>;
}

/**
 * Resolved configuration with all paths made absolute
 */
export interface ResolvedConfig {
  /** The host workspace where VS Code is running */
  hostWorkspace: string;
  /** The client workspace that the MCP server controls */
  clientWorkspace: string;
  /** Path to the extension folder, or empty string when no extension is configured */
  extensionBridgePath: string;
  /** True when extensionPath was explicitly set in host config */
  explicitExtensionDevelopmentPath: boolean;
  devDiagnostic: boolean;
  headless: boolean;
  experimentalVision: boolean;
  experimentalStructuredContent: boolean;
  launch: LaunchFlags;
  /** Resolved hot-reload configuration with defaults applied */
  hotReload: HotReloadConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalBoolean(
  obj: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = obj[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readOptionalNumber(
  obj: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readOptionalStringArray(
  obj: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = obj[key];
  if (!Array.isArray(value)) {return undefined;}
  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {return undefined;}
    strings.push(item);
  }
  return strings;
}

function coerceClientConfig(value: unknown): ClientConfig {
  if (!isRecord(value)) {return {};}

  const config: ClientConfig = {};

  const devDiagnostic = readOptionalBoolean(value, 'devDiagnostic');
  if (typeof devDiagnostic === 'boolean') {config.devDiagnostic = devDiagnostic;}

  const headless = readOptionalBoolean(value, 'headless');
  if (typeof headless === 'boolean') {config.headless = headless;}

  const experimentalVision = readOptionalBoolean(value, 'experimentalVision');
  if (typeof experimentalVision === 'boolean') {config.experimentalVision = experimentalVision;}

  const experimentalStructuredContent = readOptionalBoolean(
    value,
    'experimentalStructuredContent',
  );
  if (typeof experimentalStructuredContent === 'boolean') {
    config.experimentalStructuredContent = experimentalStructuredContent;
  }

  const launchValue = value['launch'];
  if (isRecord(launchValue)) {
    const launch: Partial<LaunchFlags> = {};

    const newWindow = readOptionalBoolean(launchValue, 'newWindow');
    if (typeof newWindow === 'boolean') {launch.newWindow = newWindow;}

    const disableExtensions = readOptionalBoolean(launchValue, 'disableExtensions');
    if (typeof disableExtensions === 'boolean') {launch.disableExtensions = disableExtensions;}

    const skipReleaseNotes = readOptionalBoolean(launchValue, 'skipReleaseNotes');
    if (typeof skipReleaseNotes === 'boolean') {launch.skipReleaseNotes = skipReleaseNotes;}

    const skipWelcome = readOptionalBoolean(launchValue, 'skipWelcome');
    if (typeof skipWelcome === 'boolean') {launch.skipWelcome = skipWelcome;}

    const disableGpu = readOptionalBoolean(launchValue, 'disableGpu');
    if (typeof disableGpu === 'boolean') {launch.disableGpu = disableGpu;}

    const disableWorkspaceTrust = readOptionalBoolean(launchValue, 'disableWorkspaceTrust');
    if (typeof disableWorkspaceTrust === 'boolean') {
      launch.disableWorkspaceTrust = disableWorkspaceTrust;
    }

    const verbose = readOptionalBoolean(launchValue, 'verbose');
    if (typeof verbose === 'boolean') {launch.verbose = verbose;}

    const localeValue = launchValue['locale'];
    if (localeValue === null) {
      launch.locale = null;
    } else if (typeof localeValue === 'string') {
      launch.locale = localeValue;
    }

    const enableExtensions = readOptionalStringArray(launchValue, 'enableExtensions');
    if (enableExtensions) {launch.enableExtensions = enableExtensions;}

    const extraArgs = readOptionalStringArray(launchValue, 'extraArgs');
    if (extraArgs) {launch.extraArgs = extraArgs;}

    config.launch = launch;
  }

  return config;
}

/** Merge partial launch flags over defaults. */
function resolveLaunchFlags(partial?: Partial<LaunchFlags>): LaunchFlags {
  if (!partial) {return {...DEFAULT_LAUNCH_FLAGS};}
  return {
    ...DEFAULT_LAUNCH_FLAGS,
    ...partial,
    // Arrays must be explicitly provided or fall back to defaults
    enableExtensions: partial.enableExtensions ?? DEFAULT_LAUNCH_FLAGS.enableExtensions,
    extraArgs: partial.extraArgs ?? DEFAULT_LAUNCH_FLAGS.extraArgs,
  };
}

/** Merge partial hot-reload config over defaults. */
function resolveHotReloadConfig(partial?: Partial<HotReloadConfig>): HotReloadConfig {
  if (!partial) {return {...DEFAULT_HOT_RELOAD_CONFIG};}
  return {
    ...DEFAULT_HOT_RELOAD_CONFIG,
    ...partial,
  };
}

/**
 * Get the host workspace where VS Code is running.
 * This is the parent of the mcp-server package.
 */
export function getHostWorkspace(): string {
  // Build output is in mcp-server/build/src/
  // Go up to mcp-server, then to parent (the host workspace)
  const packageRoot = dirname(dirname(__dirname));
  return dirname(packageRoot);
}

/**
 * Get the MCP server package root directory.
 * Build output is at mcp-server/build/src/, so __dirname goes up twice.
 *
 * Relocated from mcp-server-watcher.ts to consolidate path utilities.
 */
export function getMcpServerRoot(): string {
  return dirname(dirname(__dirname));
}

// Module-level storage for the resolved client workspace path.
// Set during loadConfig(), read via getClientWorkspace().
let _resolvedClientWorkspace: string | undefined;

/**
 * Get the client workspace that the MCP server controls.
 * Falls back to the host workspace if loadConfig() hasn't been called yet.
 */
export function getClientWorkspace(): string {
  return _resolvedClientWorkspace ?? getHostWorkspace();
}

/**
 * Load and resolve configuration from DEVTOOLS_CONFIG environment variable.
 * The extension serializes all VS Code settings as JSON and passes them
 * via the env var when spawning the MCP server process.
 */
export function loadConfig(): ResolvedConfig {
  const envConfig = process.env.DEVTOOLS_CONFIG;
  if (!envConfig) {
    logger('DEVTOOLS_CONFIG not set — using defaults (host workspace as client workspace)');
    const hostRoot = getHostWorkspace();
    _resolvedClientWorkspace = hostRoot;
    return {
      hostWorkspace: hostRoot,
      clientWorkspace: hostRoot,
      extensionBridgePath: '',
      explicitExtensionDevelopmentPath: false,
      devDiagnostic: false,
      headless: false,
      experimentalVision: false,
      experimentalStructuredContent: false,
      launch: {...DEFAULT_LAUNCH_FLAGS},
      hotReload: {...DEFAULT_HOT_RELOAD_CONFIG},
    };
  }

  const hostRoot = getHostWorkspace();

  try {
    const parsed: unknown = JSON.parse(envConfig);
    if (!isRecord(parsed)) {
      logger('DEVTOOLS_CONFIG is not a valid JSON object — using defaults');
      _resolvedClientWorkspace = hostRoot;
      return {
        hostWorkspace: hostRoot,
        clientWorkspace: hostRoot,
        extensionBridgePath: '',
        explicitExtensionDevelopmentPath: false,
        devDiagnostic: false,
        headless: false,
        experimentalVision: false,
        experimentalStructuredContent: false,
        launch: {...DEFAULT_LAUNCH_FLAGS},
        hotReload: {...DEFAULT_HOT_RELOAD_CONFIG},
      };
    }

    const clientWorkspace = (typeof parsed.clientWorkspace === 'string' && parsed.clientWorkspace)
      ? parsed.clientWorkspace
      : hostRoot;
    _resolvedClientWorkspace = clientWorkspace;

    const extensionPath = typeof parsed.extensionPath === 'string' ? parsed.extensionPath : '';
    const explicitExtensionDevelopmentPath = extensionPath.length > 0;

    const clientConfig = coerceClientConfig(parsed);
    const hotReloadPartial: Partial<HotReloadConfig> = {};
    const hrValue = parsed.hotReload;
    if (isRecord(hrValue)) {
      const enabled = readOptionalBoolean(hrValue, 'enabled');
      if (typeof enabled === 'boolean') {hotReloadPartial.enabled = enabled;}
      const restartDelay = readOptionalNumber(hrValue, 'restartDelay');
      if (typeof restartDelay === 'number') {hotReloadPartial.restartDelay = restartDelay;}
      const mcpStatusTimeout = readOptionalNumber(hrValue, 'mcpStatusTimeout');
      if (typeof mcpStatusTimeout === 'number') {hotReloadPartial.mcpStatusTimeout = mcpStatusTimeout;}
    }

    logger('Loaded config from DEVTOOLS_CONFIG environment variable');

    return {
      hostWorkspace: hostRoot,
      clientWorkspace,
      extensionBridgePath: extensionPath,
      explicitExtensionDevelopmentPath,
      devDiagnostic: clientConfig.devDiagnostic ?? false,
      headless: clientConfig.headless ?? false,
      experimentalVision: clientConfig.experimentalVision ?? false,
      experimentalStructuredContent: clientConfig.experimentalStructuredContent ?? false,
      launch: resolveLaunchFlags(clientConfig.launch),
      hotReload: resolveHotReloadConfig(hotReloadPartial),
    };
  } catch (error) {
    logger(`Failed to parse DEVTOOLS_CONFIG: ${error} — using defaults`);
    _resolvedClientWorkspace = hostRoot;
    return {
      hostWorkspace: hostRoot,
      clientWorkspace: hostRoot,
      extensionBridgePath: '',
      explicitExtensionDevelopmentPath: false,
      devDiagnostic: false,
      headless: false,
      experimentalVision: false,
      experimentalStructuredContent: false,
      launch: {...DEFAULT_LAUNCH_FLAGS},
      hotReload: {...DEFAULT_HOT_RELOAD_CONFIG},
    };
  }
}
