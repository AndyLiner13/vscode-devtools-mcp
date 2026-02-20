The `workbench.mcp.stopServer` command expects the MCP server’s **ID** as its argument. In the command implementation, `run` takes a `serverId: string`:

```typescript name=src/vs/workbench/contrib/mcp/browser/mcpCommands.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/browser/mcpCommands.ts#L860-L874
export class StopServer extends Action2 {
	constructor() {
		super({
			id: McpCommandIds.StopServer,
			title: localize2('mcp.command.stopServer', "Stop Server"),
			category,
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor, serverId: string) {
		const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
		await s?.stop();
	}
}
```

So it’s invoked as `executeCommand('workbench.mcp.stopServer', <serverId>)`. If you want, I can point to where the server IDs come from or where this command is called.

---

`<serverId>` is the MCP **server definition ID** (`McpServerDefinition.id`) — a **globally unique, stable identifier** for the server definition. It’s a `string` and is used to locate the server via `server.definition.id`.

```typescript name=src/vs/workbench/contrib/mcp/common/mcpTypes.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/common/mcpTypes.ts#L119-L139
export interface McpServerDefinition {
	/** Globally-unique, stable ID for this definition */
	readonly id: string;
	/** Human-readable label for the definition */
	readonly label: string;
	/* ... */
}
```

When adding a configuration interactively, VS Code prompts for this **unique identifier**:

```typescript name=src/vs/workbench/contrib/mcp/browser/mcpCommandsAddConfiguration.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/browser/mcpCommandsAddConfiguration.ts#L261-L270
private async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`): Promise<string | undefined> {
	const id = await this._quickInputService.input({
		title: localize('mcp.serverId.title', "Enter Server ID"),
		placeHolder: localize('mcp.serverId.placeholder', "Unique identifier for this server"),
		value: suggestion,
		ignoreFocusLost: true,
	});

	return id;
}
```

So `executeCommand('workbench.mcp.stopServer', <serverId>)` expects that unique `McpServerDefinition.id` string.

---

In VS Code, the `<serverId>` used by `workbench.mcp.stopServer` is the **`McpServerDefinition.id`** for that server. How it’s determined depends on how the server definition is created:

### 1) **Configured MCP servers (from `mcp.json`)**
The ID is formed as:

```
<collectionId>.<serverName>
```

This happens when VS Code discovers installed MCP servers and builds definitions:

```typescript name=src/vs/workbench/contrib/mcp/common/discovery/installedMcpServersDiscovery.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/common/discovery/installedMcpServersDiscovery.ts#L88-L109
definitions[1].push({
	id: `${collectionId}.${server.name}`,
	label: server.name,
	launch,
	cacheNonce: await McpServerLaunch.hash(launch),
	roots: mcpConfigPath?.workspaceFolder ? [mcpConfigPath.workspaceFolder.uri] : undefined,
	variableReplacement: {
		folder: mcpConfigPath?.workspaceFolder,
		section: mcpConfigurationSection,
		/*...*/
	},
});
```

### 2) **Manual “Add Configuration” flow**
VS Code **prompts you** to enter a unique server ID (default suggestion uses a UUID):

```typescript name=src/vs/workbench/contrib/mcp/browser/mcpCommandsAddConfiguration.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/browser/mcpCommandsAddConfiguration.ts#L261-L270
private async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`): Promise<string | undefined> {
	const id = await this._quickInputService.input({
		title: localize('mcp.serverId.title', "Enter Server ID"),
		placeHolder: localize('mcp.serverId.placeholder', "Unique identifier for this server"),
		value: suggestion,
		ignoreFocusLost: true,
	});

	return id;
}
```

So the command expects the **definition ID**, which either comes from:

- **`collectionId + "." + server.name`** (auto-discovered config), or  
- **the manually entered ID** (Add Configuration flow).

---

Here’s what the code shows about both pieces:

## `collectionId`
In the installed-servers discovery flow, the collection ID is derived from the MCP config path:

```typescript name=src/vs/workbench/contrib/mcp/common/discovery/installedMcpServersDiscovery.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/common/discovery/installedMcpServersDiscovery.ts#L73-L102
const mcpConfigPath = await mcpConfigPathPromise;
const collectionId = `mcp.config.${mcpConfigPath ? mcpConfigPath.id : 'unknown'}`;
```

So `collectionId` is `mcp.config.<mcpConfigPath.id>` (or `mcp.config.unknown` if the path is missing). The `mcpConfigPath` itself comes from `mcpWorkbenchService.getMcpConfigPath(local)` earlier in the same method.

## `server.name`
The server name comes from the local MCP server record (`ILocalMcpServer.name`), which is carried into `IWorkbenchLocalMcpServer`:

```typescript name=src/vs/platform/mcp/common/mcpManagement.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/platform/mcp/common/mcpManagement.ts#L23-L48
export interface ILocalMcpServer {
	readonly name: string;
	readonly config: IMcpServerConfiguration;
	readonly version?: string;
	/* ... */
}
```

```typescript name=src/vs/workbench/services/mcp/common/mcpWorkbenchManagementService.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/services/mcp/common/mcpWorkbenchManagementService.ts#L36-L52
export interface IWorkbenchLocalMcpServer extends ILocalMcpServer {
	readonly id: string;
	readonly scope: LocalMcpServerScope;
}
```

So `server.name` is **whatever name is stored in the local MCP server record** (ultimately populated by the MCP management/configuration pipeline).

---

`workbench.mcp.startServer` expects:

1) **`serverId: string`** — the MCP server definition ID (same as stop/restart), *or* the literal `'*'` to start **all** servers.  
2) **`opts?: IMcpServerStartOpts & { waitForLiveTools?: boolean }`** — optional start options.

From the command implementation:

```typescript name=src/vs/workbench/contrib/mcp/browser/mcpCommands.ts url=https://github.com/microsoft/vscode/blob/9135a7b73a2e1d720ed718a631393b572a417d2c/src/vs/workbench/contrib/mcp/browser/mcpCommands.ts#L806-L833
export class StartServer extends Action2 {
	constructor() {
		super({
			id: McpCommandIds.StartServer,
			title: localize2('mcp.command.startServer', "Start Server"),
			category,
			f1: false,
		});
	}

	async run(accessor: ServicesAccessor, serverId: string, opts?: IMcpServerStartOpts & { waitForLiveTools?: boolean }) {
		let servers = accessor.get(IMcpService).servers.get();
		if (serverId !== '*') {
			servers = servers.filter(s => s.definition.id === serverId);
		}

		const startOpts: IMcpServerStartOpts = { promptType: 'all-untrusted', ...opts };
		if (opts?.waitForLiveTools) {
			await Promise.all(servers.map(s => startServerAndWaitForLiveTools(s, startOpts)));
		} else {
			await Promise.all(servers.map(s => s.start(startOpts)));
		}
	}
}
```

So you can call it like:

- `executeCommand('workbench.mcp.startServer', '<serverId>')`
- `executeCommand('workbench.mcp.startServer', '*')`
- `executeCommand('workbench.mcp.startServer', '<serverId>', { waitForLiveTools: true })`  

(Plus any other `IMcpServerStartOpts` fields.)

