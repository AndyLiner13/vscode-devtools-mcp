/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ToolCategory {
	CODEBASE_ANALYSIS = 'codebase_analysis',
	DEBUGGING = 'debugging',
	DEV_DIAGNOSTICS = 'dev_diagnostics',
	EDITOR_TABS = 'editor_tabs',
	INPUT = 'input',
	NAVIGATION = 'navigation',
	UI_CONTEXT = 'ui_context'
}

const /**
	 *
	 */
	labels = {
		[ToolCategory.CODEBASE_ANALYSIS]: 'Codebase analysis',
		[ToolCategory.DEBUGGING]: 'Debugging',
		[ToolCategory.DEV_DIAGNOSTICS]: 'Development diagnostics',
		[ToolCategory.EDITOR_TABS]: 'Editor tabs',
		[ToolCategory.INPUT]: 'Input automation',
		[ToolCategory.NAVIGATION]: 'Navigation automation',
		[ToolCategory.UI_CONTEXT]: 'UI context'
	};
