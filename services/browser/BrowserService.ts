/**
 * BrowserService — encapsulates all browser automation via CDP.
 *
 * This is a class-based port of the MCP server's ax-tree.ts and cdp-events.ts.
 * All module-level state is captured as instance properties, and all functions
 * that called `cdpService.sendCdp(...)` now call `this.cdp.send(...)`.
 *
 * Lifecycle: Created after the client window spawns, disposed when it closes.
 */

import type { CdpClient, CdpSendOptions } from './CdpClient';
import type { AXNode, AXProperty, CdpTarget, ConsoleMessage, ConsoleMessageArg, ConsoleStackFrame, DiffResult, FrameInfo, NodeSignature, ScreenshotOptions } from './types';

// ── Constants ────────────────────────────────────────────────────────────────

const UID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const UID_LENGTH = 4;

const IGNORED_ROLES = new Set(['none', 'generic', 'Ignore', 'IgnoredRole', 'InlineTextBox', 'LineBreak']);

const ROLE_DESCRIPTIONS: Record<string, string> = {
	alert: 'alert',
	alertdialog: 'alert dialog',
	application: 'application',
	article: 'article',
	banner: 'banner',
	button: 'button',
	cell: 'cell',
	checkbox: 'checkbox',
	columnheader: 'column header',
	combobox: 'combobox',
	complementary: 'complementary',
	contentinfo: 'content info',
	definition: 'definition',
	dialog: 'dialog',
	directory: 'directory',
	document: 'document',
	figure: 'figure',
	form: 'form',
	grid: 'grid',
	gridcell: 'grid cell',
	group: 'group',
	heading: 'heading',
	img: 'image',
	link: 'link',
	list: 'list',
	listitem: 'list item',
	log: 'log',
	main: 'main',
	marquee: 'marquee',
	math: 'math',
	menu: 'menu',
	menubar: 'menubar',
	menuitem: 'menu item',
	navigation: 'navigation',
	note: 'note',
	progressbar: 'progress bar',
	radio: 'radio button',
	region: 'region',
	RootWebArea: 'web area',
	row: 'row',
	rowheader: 'row header',
	scrollbar: 'scrollbar',
	search: 'search',
	separator: 'separator',
	slider: 'slider',
	spinbutton: 'spin button',
	StaticText: 'text',
	status: 'status',
	switch: 'switch',
	tab: 'tab',
	table: 'table',
	tablist: 'tab list',
	tabpanel: 'tab panel',
	textbox: 'textbox',
	timer: 'timer',
	toolbar: 'toolbar',
	tooltip: 'tooltip',
	tree: 'tree',
	treegrid: 'tree grid',
	treeitem: 'tree item',
	WebArea: 'web area'
};

// Key name mapping for CDP Input.dispatchKeyEvent
const KEY_DEFINITIONS: Record<string, { key: string; code: string; keyCode: number; text?: string }> = {
	arrowdown: { code: 'ArrowDown', key: 'ArrowDown', keyCode: 40 },
	arrowleft: { code: 'ArrowLeft', key: 'ArrowLeft', keyCode: 37 },
	arrowright: { code: 'ArrowRight', key: 'ArrowRight', keyCode: 39 },
	arrowup: { code: 'ArrowUp', key: 'ArrowUp', keyCode: 38 },
	backspace: { code: 'Backspace', key: 'Backspace', keyCode: 8 },
	delete: { code: 'Delete', key: 'Delete', keyCode: 46 },
	end: { code: 'End', key: 'End', keyCode: 35 },
	enter: { code: 'Enter', key: 'Enter', keyCode: 13, text: '\r' },
	esc: { code: 'Escape', key: 'Escape', keyCode: 27 },
	escape: { code: 'Escape', key: 'Escape', keyCode: 27 },
	f1: { code: 'F1', key: 'F1', keyCode: 112 },
	f2: { code: 'F2', key: 'F2', keyCode: 113 },
	f3: { code: 'F3', key: 'F3', keyCode: 114 },
	f4: { code: 'F4', key: 'F4', keyCode: 115 },
	f5: { code: 'F5', key: 'F5', keyCode: 116 },
	f6: { code: 'F6', key: 'F6', keyCode: 117 },
	f7: { code: 'F7', key: 'F7', keyCode: 118 },
	f8: { code: 'F8', key: 'F8', keyCode: 119 },
	f9: { code: 'F9', key: 'F9', keyCode: 120 },
	f10: { code: 'F10', key: 'F10', keyCode: 121 },
	f11: { code: 'F11', key: 'F11', keyCode: 122 },
	f12: { code: 'F12', key: 'F12', keyCode: 123 },
	home: { code: 'Home', key: 'Home', keyCode: 36 },
	insert: { code: 'Insert', key: 'Insert', keyCode: 45 },
	pagedown: { code: 'PageDown', key: 'PageDown', keyCode: 34 },
	pageup: { code: 'PageUp', key: 'PageUp', keyCode: 33 },
	return: { code: 'Enter', key: 'Enter', keyCode: 13, text: '\r' },
	space: { code: 'Space', key: ' ', keyCode: 32, text: ' ' },
	tab: { code: 'Tab', key: 'Tab', keyCode: 9 }
};

const MODIFIER_KEYS: Record<string, number> = {
	alt: 1,
	control: 2,
	ctrl: 2,
	meta: 4,
	shift: 8
};

// ── BrowserService ───────────────────────────────────────────────────────────

export class BrowserService {
	private readonly cdp: CdpClient;

	// AX tree state
	private readonly uidToAXNode = new Map<string, AXNode>();
	private readonly cdpNodeMap = new Map<number, AXNode>();
	private readonly uidToFrameId = new Map<string, string>();
	private uidCounter = 0;

	// Console state
	private readonly consoleMessages: ConsoleMessage[] = [];
	private nextMessageId = 1;
	private consoleListenerAttached = false;

	constructor(cdp: CdpClient) {
		this.cdp = cdp;
	}

	// ========================================================================
	// Console Message Collection
	// ========================================================================

	initConsoleCollection(): void {
		if (this.consoleListenerAttached) {
			return;
		}
		this.consoleListenerAttached = true;

		this.cdp.addEventListener((method, params) => {
			if (method !== 'Runtime.consoleAPICalled') {
				return;
			}

			const type = (params.type as string) ?? 'log';
			const rawArgs = (params.args as ConsoleMessageArg[]) ?? [];

			const textParts: string[] = [];
			const processedArgs: ConsoleMessageArg[] = [];

			for (const arg of rawArgs) {
				if (arg.type === 'string') {
					textParts.push(String(arg.value ?? ''));
				} else if (arg.description) {
					textParts.push(arg.description);
				} else if (arg.value !== undefined) {
					textParts.push(JSON.stringify(arg.value));
				} else {
					textParts.push(`[${arg.type}]`);
				}

				processedArgs.push({
					className: arg.className,
					description: arg.description,
					subtype: arg.subtype,
					type: arg.type,
					value: arg.value
				});
			}

			const rawStackTrace = params.stackTrace as undefined | { callFrames?: ConsoleStackFrame[] };
			const stackTrace = rawStackTrace?.callFrames?.map((f) => ({
				columnNumber: f.columnNumber ?? 0,
				functionName: f.functionName ?? '',
				lineNumber: f.lineNumber ?? 0,
				url: f.url ?? ''
			}));

			this.consoleMessages.push({
				args: processedArgs,
				id: this.nextMessageId++,
				stackTrace,
				text: textParts.join(' '),
				timestamp: Date.now(),
				type
			});
		});
	}

	getConsoleMessages(options: { limit?: number }): { messages: ConsoleMessage[]; total: number } {
		const { limit } = options;
		const total = this.consoleMessages.length;
		const messages = limit ? this.consoleMessages.slice(-limit) : [...this.consoleMessages];
		return { messages, total };
	}

	getConsoleMessageById(id: number): ConsoleMessage | undefined {
		return this.consoleMessages.find((m) => m.id === id);
	}

	clearConsole(): void {
		this.consoleMessages.length = 0;
	}

	// ========================================================================
	// AX Tree — Fetching & Formatting
	// ========================================================================

	async fetchAXTree(verbose: boolean): Promise<{ formatted: string; raw: AXNode[] }> {
		// Clear previous state
		this.uidToAXNode.clear();
		this.cdpNodeMap.clear();
		this.uidToFrameId.clear();
		this.uidCounter = 0;

		const rootNodes = await this.fetchFrameTree();
		this.assignUids(rootNodes);

		const formatted = this.formatAXTreeToString(rootNodes, verbose);
		return { formatted, raw: rootNodes };
	}

	private async fetchFrameTree(): Promise<AXNode[]> {
		// Get main frame AX tree
		const result = await this.cdp.send('Accessibility.getFullAXTree');
		const nodes = (result.nodes as AXNode[]) ?? [];

		// Build node map and tree
		const nodeMap = new Map<string, AXNode>();
		for (const node of nodes) {
			node.children = [];
			nodeMap.set(node.nodeId, node);
			if (node.backendDOMNodeId) {
				this.cdpNodeMap.set(node.backendDOMNodeId, node);
			}
		}

		// Set parent-child relationships
		for (const node of nodes) {
			if (node.childIds) {
				for (const childId of node.childIds) {
					const child = nodeMap.get(childId);
					if (child) {
						child.parentId = node.nodeId;
						node.children!.push(child);
					}
				}
			}
		}

		// Get root nodes (no parent)
		const roots = nodes.filter((n) => !n.parentId);

		// Fetch OOPIF frame trees
		const attachedTargets = this.cdp.getAttachedTargets();
		for (const [, target] of attachedTargets) {
			if (target.type !== 'iframe' && target.type !== 'page') {
				continue;
			}
			try {
				const frameResult = await this.cdp.send('Accessibility.getFullAXTree', undefined, { sessionId: target.sessionId });
				const frameNodes = (frameResult.nodes as AXNode[]) ?? [];
				if (frameNodes.length === 0) {
					continue;
				}

				const frameNodeMap = new Map<string, AXNode>();
				for (const node of frameNodes) {
					node.children = [];
					node.frameId = target.targetId;
					frameNodeMap.set(node.nodeId, node);
					if (node.backendDOMNodeId) {
						this.cdpNodeMap.set(node.backendDOMNodeId, node);
					}
				}

				for (const node of frameNodes) {
					if (node.childIds) {
						for (const childId of node.childIds) {
							const child = frameNodeMap.get(childId);
							if (child) {
								child.parentId = node.nodeId;
								node.children!.push(child);
							}
						}
					}
				}

				const frameRoots = frameNodes.filter((n) => !n.parentId);
				for (const root of frameRoots) {
					roots.push(root);
				}
			} catch {
				// Frame may have been destroyed
			}
		}

		return roots;
	}

	private assignUids(nodes: AXNode[]): void {
		const traverse = (node: AXNode): void => {
			const role = node.role?.value ?? '';
			if (node.ignored || IGNORED_ROLES.has(role)) {
				// Still process children of ignored nodes
				if (node.children) {
					for (const child of node.children) {
						traverse(child);
					}
				}
				return;
			}

			const uid = this.generateUid();
			node.uid = uid;
			this.uidToAXNode.set(uid, node);
			if (node.frameId) {
				this.uidToFrameId.set(uid, node.frameId);
			}

			if (node.children) {
				for (const child of node.children) {
					traverse(child);
				}
			}
		};

		for (const root of nodes) {
			traverse(root);
		}
	}

	private generateUid(): string {
		let uid: string;
		do {
			uid = '';
			for (let i = 0; i < UID_LENGTH; i++) {
				uid += UID_CHARS[Math.floor(Math.random() * UID_CHARS.length)];
			}
		} while (this.uidToAXNode.has(uid));
		return uid;
	}

	private formatAXTreeToString(nodes: AXNode[], verbose: boolean): string {
		const lines: string[] = [];
		const format = (node: AXNode, depth: number): void => {
			const role = node.role?.value ?? '';

			// Skip ignored roles (but process children)
			if (node.ignored || IGNORED_ROLES.has(role)) {
				if (node.children) {
					for (const child of node.children) {
						format(child, depth);
					}
				}
				return;
			}

			const indent = '  '.repeat(depth);
			const uid = node.uid ?? '??';
			const roleName = this.describeRole(role);
			const name = node.name?.value ? ` "${node.name.value}"` : '';

			const props: string[] = [];
			if (node.properties) {
				for (const prop of node.properties) {
					if (verbose || this.isImportantProperty(prop)) {
						const val = prop.value?.value;
						if (val !== undefined && val !== false && val !== '') {
							props.push(`${prop.name}=${JSON.stringify(val)}`);
						}
					}
				}
			}

			// Value (for inputs, etc.)
			if (node.value?.value !== undefined && node.value.value !== '') {
				props.push(`value=${JSON.stringify(node.value.value)}`);
			}

			const propStr = props.length > 0 ? ` [${props.join(', ')}]` : '';
			lines.push(`${indent}[${uid}] ${roleName}${name}${propStr}`);

			if (node.children) {
				for (const child of node.children) {
					format(child, depth + 1);
				}
			}
		};

		for (const root of nodes) {
			format(root, 0);
		}

		return lines.join('\n');
	}

	private describeRole(role: string): string {
		return ROLE_DESCRIPTIONS[role] ?? role;
	}

	private isImportantProperty(prop: AXProperty): boolean {
		const important = new Set(['focused', 'selected', 'checked', 'disabled', 'expanded', 'required', 'invalid', 'level', 'autocomplete', 'haspopup', 'modal', 'multiselectable', 'orientation', 'pressed']);
		return important.has(prop.name);
	}

	// ========================================================================
	// Element Resolution
	// ========================================================================

	getAXNodeByUid(uid: string): AXNode | undefined {
		return this.uidToAXNode.get(uid);
	}

	private getSessionIdForUid(uid: string): string | undefined {
		const frameId = this.uidToFrameId.get(uid);
		if (!frameId) {
			return undefined;
		}
		const target = this.cdp.getAttachedTargets().get(frameId);
		return target?.sessionId;
	}

	private async getBackendNodeId(uid: string): Promise<{ backendNodeId: number; sessionId?: string }> {
		const node = this.uidToAXNode.get(uid);
		if (!node) {
			throw new Error(`Element with uid "${uid}" not found. Take a new snapshot to refresh.`);
		}
		if (!node.backendDOMNodeId) {
			throw new Error(`Element "${uid}" has no DOM node ID`);
		}
		return {
			backendNodeId: node.backendDOMNodeId,
			sessionId: this.getSessionIdForUid(uid)
		};
	}

	private async getElementCenter(uid: string): Promise<{ x: number; y: number; sessionId?: string }> {
		const { backendNodeId, sessionId } = await this.getBackendNodeId(uid);
		const opts: CdpSendOptions = sessionId ? { sessionId } : {};

		// Resolve node to get its objectId
		const resolveResult = await this.cdp.send('DOM.resolveNode', { backendNodeId }, opts);
		const obj = resolveResult.object as undefined | { objectId?: string };
		if (!obj?.objectId) {
			throw new Error(`Could not resolve DOM node for element "${uid}"`);
		}

		// Get box model
		try {
			const boxResult = await this.cdp.send('DOM.getBoxModel', { backendNodeId }, opts);
			const model = boxResult.model as undefined | { content: number[] };
			if (model?.content) {
				const [x1, y1, x2, y2, x3, y3, x4, y4] = model.content;
				const x = (x1 + x2 + x3 + x4) / 4;
				const y = (y1 + y2 + y3 + y4) / 4;
				return { sessionId, x, y };
			}
		} catch {
			// Fall back to bounding rect
		}

		// Fallback: use JS getBoundingClientRect
		const evalResult = await this.cdp.send(
			'Runtime.callFunctionOn',
			{
				functionDeclaration: `function() {
                const rect = this.getBoundingClientRect();
                return JSON.stringify({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
            }`,
				objectId: obj.objectId,
				returnByValue: true
			},
			opts
		);

		const evalValue = evalResult.result as undefined | { value?: string };
		if (evalValue?.value) {
			const coords = JSON.parse(evalValue.value) as { x: number; y: number };
			return { ...coords, sessionId };
		}

		throw new Error(`Could not determine position of element "${uid}"`);
	}

	// ========================================================================
	// Element Interactions
	// ========================================================================

	async focusElement(uid: string): Promise<void> {
		const { backendNodeId, sessionId } = await this.getBackendNodeId(uid);
		const opts: CdpSendOptions = sessionId ? { sessionId } : {};
		await this.cdp.send('DOM.focus', { backendNodeId }, opts);
	}

	async scrollIntoView(uid: string): Promise<void> {
		const { backendNodeId, sessionId } = await this.getBackendNodeId(uid);
		const opts: CdpSendOptions = sessionId ? { sessionId } : {};
		try {
			await this.cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId }, opts);
		} catch {
			// Not all elements support scroll-into-view
		}
	}

	async clickAtCoords(x: number, y: number, clickCount = 1): Promise<void> {
		await this.cdp.send('Input.dispatchMouseEvent', {
			button: 'left',
			clickCount,
			type: 'mousePressed',
			x,
			y
		});
		await this.cdp.send('Input.dispatchMouseEvent', {
			button: 'left',
			clickCount,
			type: 'mouseReleased',
			x,
			y
		});
	}

	async clickElement(uid: string, clickCount = 1): Promise<void> {
		await this.scrollIntoView(uid);
		const { x, y } = await this.getElementCenter(uid);
		await this.clickAtCoords(x, y, clickCount);
	}

	async hoverElement(uid: string): Promise<void> {
		await this.scrollIntoView(uid);
		const { x, y } = await this.getElementCenter(uid);
		await this.cdp.send('Input.dispatchMouseEvent', {
			type: 'mouseMoved',
			x,
			y
		});
	}

	async insertText(text: string): Promise<void> {
		await this.cdp.send('Input.insertText', { text });
	}

	async clearFocusedElement(): Promise<void> {
		// Select all + delete
		await this.dispatchKeyCombo('a', ['Control']);
		await this.dispatchRawKey('Backspace');
	}

	async fillElement(uid: string, value: string): Promise<void> {
		const { backendNodeId, sessionId } = await this.getBackendNodeId(uid);
		const opts: CdpSendOptions = sessionId ? { sessionId } : {};

		// Check if it's a <select> element
		const resolveResult = await this.cdp.send('DOM.resolveNode', { backendNodeId }, opts);
		const obj = resolveResult.object as undefined | { objectId?: string };
		if (obj?.objectId) {
			const tagResult = await this.cdp.send(
				'Runtime.callFunctionOn',
				{
					functionDeclaration: 'function() { return this.tagName; }',
					objectId: obj.objectId,
					returnByValue: true
				},
				opts
			);
			const tag = (tagResult.result as { value?: string })?.value;

			if (tag?.toUpperCase() === 'SELECT') {
				// For <select>, set value directly via JS
				await this.cdp.send(
					'Runtime.callFunctionOn',
					{
						arguments: [{ value }],
						functionDeclaration: `function(val) {
                        this.value = val;
                        this.dispatchEvent(new Event('input', { bubbles: true }));
                        this.dispatchEvent(new Event('change', { bubbles: true }));
                    }`,
						objectId: obj.objectId,
						returnByValue: true
					},
					opts
				);
				return;
			}
		}

		// For regular inputs: focus, clear, then type
		await this.focusElement(uid);
		await this.clearFocusedElement();
		await this.insertText(value);
	}

	async typeIntoElement(uid: string, value: string): Promise<void> {
		await this.focusElement(uid);
		await this.insertText(value);
	}

	async dragElement(fromUid: string, toUid: string): Promise<void> {
		await this.scrollIntoView(fromUid);
		const from = await this.getElementCenter(fromUid);
		const to = await this.getElementCenter(toUid);

		// Mouse down on source
		await this.cdp.send('Input.dispatchMouseEvent', {
			button: 'left',
			clickCount: 1,
			type: 'mousePressed',
			x: from.x,
			y: from.y
		});

		// Move to target (with intermediate steps for smooth drag)
		const steps = 5;
		for (let i = 1; i <= steps; i++) {
			const ratio = i / steps;
			await this.cdp.send('Input.dispatchMouseEvent', {
				button: 'left',
				type: 'mouseMoved',
				x: from.x + (to.x - from.x) * ratio,
				y: from.y + (to.y - from.y) * ratio
			});
		}

		// Mouse up on target
		await this.cdp.send('Input.dispatchMouseEvent', {
			button: 'left',
			clickCount: 1,
			type: 'mouseReleased',
			x: to.x,
			y: to.y
		});
	}

	async scrollElement(uid: string, direction?: string, amount?: number): Promise<void> {
		if (!direction) {
			// Just scroll into view
			await this.scrollIntoView(uid);
			return;
		}

		await this.scrollIntoView(uid);
		const { x, y } = await this.getElementCenter(uid);
		const scrollAmount = amount ?? 300;

		let deltaX = 0;
		let deltaY = 0;
		switch (direction) {
			case 'up':
				deltaY = -scrollAmount;
				break;
			case 'down':
				deltaY = scrollAmount;
				break;
			case 'left':
				deltaX = -scrollAmount;
				break;
			case 'right':
				deltaX = scrollAmount;
				break;
		}

		await this.cdp.send('Input.dispatchMouseEvent', {
			deltaX,
			deltaY,
			type: 'mouseWheel',
			x,
			y
		});
	}

	// ========================================================================
	// Key Input
	// ========================================================================

	async dispatchRawKey(keyName: string, modifiers = 0): Promise<void> {
		const def = KEY_DEFINITIONS[keyName.toLowerCase()];
		if (!def) {
			// Single character key
			const charCode = keyName.charCodeAt(0);
			await this.cdp.send('Input.dispatchKeyEvent', {
				code: `Key${keyName.toUpperCase()}`,
				key: keyName,
				modifiers,
				nativeVirtualKeyCode: charCode,
				type: 'keyDown',
				windowsVirtualKeyCode: charCode
			});
			if (keyName.length === 1) {
				await this.cdp.send('Input.dispatchKeyEvent', {
					key: keyName,
					modifiers,
					text: keyName,
					type: 'char'
				});
			}
			await this.cdp.send('Input.dispatchKeyEvent', {
				code: `Key${keyName.toUpperCase()}`,
				key: keyName,
				modifiers,
				nativeVirtualKeyCode: charCode,
				type: 'keyUp',
				windowsVirtualKeyCode: charCode
			});
			return;
		}

		await this.cdp.send('Input.dispatchKeyEvent', {
			code: def.code,
			key: def.key,
			modifiers,
			nativeVirtualKeyCode: def.keyCode,
			type: 'keyDown',
			windowsVirtualKeyCode: def.keyCode,
			...(def.text ? { text: def.text } : {})
		});

		if (def.text) {
			await this.cdp.send('Input.dispatchKeyEvent', {
				key: def.key,
				modifiers,
				text: def.text,
				type: 'char'
			});
		}

		await this.cdp.send('Input.dispatchKeyEvent', {
			code: def.code,
			key: def.key,
			modifiers,
			nativeVirtualKeyCode: def.keyCode,
			type: 'keyUp',
			windowsVirtualKeyCode: def.keyCode
		});
	}

	async dispatchKeyCombo(key: string, modifierNames: string[]): Promise<void> {
		let modifiers = 0;
		for (const mod of modifierNames) {
			modifiers |= MODIFIER_KEYS[mod.toLowerCase()] ?? 0;
		}
		await this.dispatchRawKey(key, modifiers);
	}

	async pressKey(keyInput: string): Promise<void> {
		// Parse key combo: "Control+Shift+A"
		const parts = keyInput.split('+');
		const key = parts.pop()!;
		const modifierNames = parts;

		if (modifierNames.length > 0) {
			await this.dispatchKeyCombo(key, modifierNames);
		} else {
			await this.dispatchRawKey(key);
		}
	}

	// ========================================================================
	// Screenshots
	// ========================================================================

	async captureScreenshot(options: ScreenshotOptions = {}): Promise<Buffer> {
		const { format = 'png', fullPage, quality, uid } = options;

		if (uid && fullPage) {
			throw new Error('Cannot specify both uid and fullPage');
		}

		let clip: undefined | { x: number; y: number; width: number; height: number; scale: number };

		if (uid) {
			// Screenshot a specific element
			await this.scrollIntoView(uid);
			const { backendNodeId, sessionId } = await this.getBackendNodeId(uid);
			const opts: CdpSendOptions = sessionId ? { sessionId } : {};

			const boxResult = await this.cdp.send('DOM.getBoxModel', { backendNodeId }, opts);
			const model = boxResult.model as undefined | { content: number[] };
			if (model?.content) {
				const [x1, y1, x2, , , , x4, y4] = model.content;
				clip = {
					height: Math.abs(y4 - y1),
					scale: 1,
					width: Math.abs(x2 - x1),
					x: Math.min(x1, x4),
					y: Math.min(y1, y4)
				};
			}
		}

		if (fullPage) {
			// Get full page dimensions
			const layoutResult = await this.cdp.send('Page.getLayoutMetrics');
			const contentSize = layoutResult.contentSize as undefined | { width: number; height: number };
			if (contentSize) {
				clip = {
					height: contentSize.height,
					scale: 1,
					width: contentSize.width,
					x: 0,
					y: 0
				};
			}
		}

		const params: Record<string, unknown> = {
			format: format === 'png' ? 'png' : format === 'webp' ? 'webp' : 'jpeg'
		};
		if (quality !== undefined && format !== 'png') {
			params.quality = quality;
		}
		if (clip) {
			params.clip = clip;
		}
		params.captureBeyondViewport = !!fullPage;

		const result = await this.cdp.send('Page.captureScreenshot', params);
		const data = result.data as string;
		return Buffer.from(data, 'base64');
	}

	// ========================================================================
	// Snapshot Diffs
	// ========================================================================

	async fetchAXTreeForDiff(): Promise<Map<string, NodeSignature>> {
		const result = await this.cdp.send('Accessibility.getFullAXTree');
		const nodes = (result.nodes as AXNode[]) ?? [];

		const signatureMap = new Map<string, NodeSignature>();
		const childCountMap = new Map<string, number>();

		// Count children per node
		for (const node of nodes) {
			if (node.childIds) {
				childCountMap.set(node.nodeId, node.childIds.length);
			}
		}

		for (const node of nodes) {
			const role = node.role?.value ?? '';
			if (IGNORED_ROLES.has(role)) {
				continue;
			}
			signatureMap.set(node.nodeId, {
				childCount: childCountMap.get(node.nodeId) ?? 0,
				name: node.name?.value ?? '',
				role
			});
		}

		return signatureMap;
	}

	async fetchAXTreeForDiffWithUids(): Promise<{ uidMap: Map<string, string>; signatureMap: Map<string, NodeSignature> }> {
		// Reuse the existing uidToAXNode mapping
		const uidMap = new Map<string, string>();
		for (const [uid, node] of this.uidToAXNode) {
			uidMap.set(node.nodeId, uid);
		}

		const signatureMap = await this.fetchAXTreeForDiff();
		return { signatureMap, uidMap };
	}

	diffSnapshots(before: Map<string, NodeSignature>, after: Map<string, NodeSignature>): string {
		const added: string[] = [];
		const removed: string[] = [];
		const changed: string[] = [];

		for (const [nodeId, sig] of after) {
			const beforeSig = before.get(nodeId);
			if (!beforeSig) {
				const desc = sig.name ? `${sig.role} "${sig.name}"` : sig.role;
				added.push(`  + ${desc}`);
			} else if (beforeSig.name !== sig.name || beforeSig.role !== sig.role || beforeSig.childCount !== sig.childCount) {
				const desc = sig.name ? `${sig.role} "${sig.name}"` : sig.role;
				changed.push(`  ~ ${desc}`);
			}
		}

		for (const [nodeId, sig] of before) {
			if (!after.has(nodeId)) {
				const desc = sig.name ? `${sig.role} "${sig.name}"` : sig.role;
				removed.push(`  - ${desc}`);
			}
		}

		if (added.length === 0 && removed.length === 0 && changed.length === 0) {
			return 'No visible changes detected.';
		}

		const sections: string[] = [];
		if (added.length > 0) {
			sections.push(`Added:\n${added.join('\n')}`);
		}
		if (removed.length > 0) {
			sections.push(`Removed:\n${removed.join('\n')}`);
		}
		if (changed.length > 0) {
			sections.push(`Changed:\n${changed.join('\n')}`);
		}

		return sections.join('\n\n');
	}

	async waitForChanges(beforeMap: Map<string, NodeSignature>, timeout: number): Promise<Map<string, NodeSignature>> {
		const startTime = Date.now();
		const pollInterval = 200;

		while (Date.now() - startTime < timeout) {
			await new Promise<void>((r) => setTimeout(r, pollInterval));
			const after = await this.fetchAXTreeForDiff();

			// Check if anything changed
			if (after.size !== beforeMap.size) {
				return after;
			}

			let hasChange = false;
			for (const [nodeId, sig] of after) {
				const beforeSig = beforeMap.get(nodeId);
				if (beforeSig?.name !== sig.name || beforeSig.role !== sig.role || beforeSig.childCount !== sig.childCount) {
					hasChange = true;
					break;
				}
			}

			if (hasChange) {
				return after;
			}
		}

		// Timeout — return current state
		return this.fetchAXTreeForDiff();
	}

	async executeWithDiff<T>(action: () => Promise<T>, timeout = 1500): Promise<{ result: T; summary: string }> {
		const before = await this.fetchAXTreeForDiff();
		const result = await action();
		const after = await this.waitForChanges(before, timeout);
		const summary = this.diffSnapshots(before, after);
		return { result, summary };
	}

	// ========================================================================
	// CDP Targets Info (for snapshot tool)
	// ========================================================================

	async getTargetsSummary(): Promise<string> {
		const targets = await this.cdp.refreshTargets();
		const attached = this.cdp.getAttachedTargets();

		if (targets.length === 0) {
			return '';
		}

		const lines = ['## CDP Targets\n'];
		for (const target of targets) {
			const isAttached = attached.has(target.id);
			const marker = isAttached ? '●' : '○';
			lines.push(`${marker} **${target.type}**: ${target.title || target.url}`);
		}

		return lines.join('\n');
	}

	// ========================================================================
	// Disposal
	// ========================================================================

	dispose(): void {
		this.uidToAXNode.clear();
		this.cdpNodeMap.clear();
		this.uidToFrameId.clear();
		this.consoleMessages.length = 0;
	}
}
