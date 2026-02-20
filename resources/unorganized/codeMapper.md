Below is a focused walkthrough of **how the CodeMapper (“Mapped Edits”) tool works** in `microsoft/vscode`, based on the current code. I’ll also show where to look for the *actual provider implementation* (the piece that turns code blocks into edits).

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search:  
> https://github.com/search?q=repo%3Amicrosoft%2Fvscode%20provideMappedEdits&type=code

---

# 1) The public API surface: MappedEditsProvider2
VS Code exposes a **proposed API** for extensions to provide mapped edits:

```typescript name=src/vscode-dts/vscode.proposed.mappedEditsProvider.d.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vscode-dts/vscode.proposed.mappedEditsProvider.d.ts#L63-L110
export interface MappedEditsRequest {
	readonly codeBlocks: { code: string; resource: Uri; markdownBeforeBlock?: string }[];
	readonly location?: string;
	readonly chatRequestId?: string;
	readonly chatRequestModel?: string;
	readonly chatSessionId?: string;
}

export interface MappedEditsResponseStream {
	textEdit(target: Uri, edits: TextEdit | TextEdit[]): void;
	notebookEdit(target: Uri, edits: NotebookEdit | NotebookEdit[]): void;
}

export interface MappedEditsProvider2 {
	provideMappedEdits(
		request: MappedEditsRequest,
		result: MappedEditsResponseStream,
		token: CancellationToken
	): ProviderResult<MappedEditsResult>;
}

namespace chat {
	export function registerMappedEditsProvider2(provider: MappedEditsProvider2): Disposable;
}
```

**Key idea:** a provider receives the LLM’s code blocks and streams back text edits or notebook edits.

---

# 2) Registration (extension host)
When an extension registers a `MappedEditsProvider2`, the extension host stores it:

```typescript name=src/vs/workbench/api/common/extHostCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/common/extHostCodeMapper.ts#L67-L81
registerMappedEditsProvider(extension: IExtensionDescription, provider: vscode.MappedEditsProvider2): vscode.Disposable {
	const handle = ExtHostCodeMapper._providerHandlePool++;
	this._proxy.$registerCodeMapperProvider(handle, extension.displayName ?? extension.name);
	this.providers.set(handle, provider);
	return {
		dispose: () => {
			return this._proxy.$unregisterCodeMapperProvider(handle);
		}
	};
}
```

---

# 3) Main thread bridge
The main thread registers a provider that **proxies** to the extension host:

```typescript name=src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts#L31-L46
$registerCodeMapperProvider(handle: number, displayName: string): void {
	const impl: ICodeMapperProvider = {
		displayName,
		mapCode: async (uiRequest, response, token) => {
			const requestId = String(MainThreadChatCodemapper._requestHandlePool++);
			this._responseMap.set(requestId, response);
			const extHostRequest: ICodeMapperRequestDto = {
				requestId,
				codeBlocks: uiRequest.codeBlocks,
				chatRequestId: uiRequest.chatRequestId,
				chatRequestModel: uiRequest.chatRequestModel,
				chatSessionResource: uiRequest.chatSessionResource,
				location: uiRequest.location
			};
			return await this._proxy.$mapCode(handle, extHostRequest, token);
		}
	};
	/* ... */
}
```

---

# 4) The CodeMapper service (dispatcher)
The internal `CodeMapperService` simply calls the first registered provider:

```typescript name=src/vs/workbench/contrib/chat/common/editing/chatCodeMapperService.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/editing/chatCodeMapperService.ts#L50-L77
async mapCode(request: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken) {
	for (const provider of this.providers) {
		const result = await provider.mapCode(request, response, token);
		if (token.isCancellationRequested) {
			return undefined;
		}
		return result;
	}
	return undefined;
}
```

---

# 5) Extension host executes the provider
The extension host receives the request and calls the actual provider’s `provideMappedEdits`, streaming edits back:

```typescript name=src/vs/workbench/api/common/extHostCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/common/extHostCodeMapper.ts#L29-L68
async $mapCode(handle: number, internalRequest: ICodeMapperRequestDto, token: CancellationToken): Promise<ICodeMapperResult | null> {
	const provider = this.providers.get(handle);
	if (!provider) {
		throw new Error(`Received request to map code for unknown provider handle ${handle}`);
	}

	const stream: vscode.MappedEditsResponseStream = {
		textEdit: (target, edits) => {
			edits = asArray(edits);
			this._proxy.$handleProgress(internalRequest.requestId, {
				uri: target,
				edits: edits.map(TextEdit.from)
			});
		},
		notebookEdit: (target, edits) => {
			edits = asArray(edits);
			this._proxy.$handleProgress(internalRequest.requestId, {
				uri: target,
				edits: edits.map(NotebookEdit.from)
			});
		}
	};

	const request: vscode.MappedEditsRequest = {
		location: internalRequest.location,
		chatRequestId: internalRequest.chatRequestId,
		chatRequestModel: internalRequest.chatRequestModel,
		chatSessionId: /* ... */,
		codeBlocks: internalRequest.codeBlocks.map(block => ({
			code: block.code,
			resource: URI.revive(block.resource),
			markdownBeforeBlock: block.markdownBeforeBlock
		}))
	};

	const result = await provider.provideMappedEdits(request, stream, token);
	return result ?? null;
}
```

---

# 6) Progress streaming back to the UI
Main thread receives progress and forwards it to the response handler:

```typescript name=src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts#L56-L74
$handleProgress(requestId: string, data: ICodeMapperProgressDto): Promise<void> {
	const response = this._responseMap.get(requestId);
	if (response) {
		const edits = data.edits;
		const resource = URI.revive(data.uri);
		if (!edits.length) {
			response.textEdit(resource, []);
		} else if (edits.every(TextEdit.isTextEdit)) {
			response.textEdit(resource, edits);
		} else {
			response.notebookEdit(resource, edits.map(NotebookDto.fromCellEditOperationDto));
		}
	}
	return Promise.resolve();
}
```

---

# What’s missing here?
The **real mapping logic** lives in the extension that implements `MappedEditsProvider2`.  
This repo shows the infrastructure, but not necessarily *which extension* provides the mapping behavior by default.

---

Below is how **MappedEditsProvider2** (“map to edits provider 2”) works in the **vscode-copilot-chat** repo. I’ll tie it to the exact implementation classes used by the extension.

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search:  
> https://github.com/search?q=repo%3Amicrosoft%2Fvscode-copilot-chat%20MappedEditsProvider2&type=code

---

# 1) The provider is registered by the extension
The Copilot Chat extension registers its own provider at startup:

```typescript name=src/extension/conversation/vscode-node/aiMappedEditsContrib.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/conversation/vscode-node/aiMappedEditsContrib.ts#L1-L27
export class AiMappedEditsContrib extends Disposable implements IExtensionContribution {
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IEnvService envService: IEnvService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExperimentationService experimentationService: IExperimentationService
	) {
		super();

		this._register(vscode.chat.registerMappedEditsProvider2(instantiationService.createInstance(AIMappedEditsProvider2)));
	}
}
```

---

# 2) The provider implementation
`AIMappedEditsProvider2` takes each code block and passes it to the extension’s **CodeMapperService**:

```typescript name=src/extension/conversation/node/aiMappedEditsProvider.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/conversation/node/aiMappedEditsProvider.ts#L1-L46
export class AIMappedEditsProvider2 implements vscode.MappedEditsProvider2 {

	constructor(
		@ICodeMapperService private readonly _codeMapperService: ICodeMapperService,
	) {
	}

	async provideMappedEdits(
		request: vscode.MappedEditsRequest,
		response: vscode.MappedEditsResponseStream,
		token: vscode.CancellationToken
	): Promise<vscode.MappedEditsResult | null | undefined> {

		const errorMessages: string[] = [];
		for (const codeBlock of request.codeBlocks) {
			if (token.isCancellationRequested) {
				return undefined;
			}

			const result = await this._codeMapperService.mapCode(
				{ codeBlock, location: request.location },
				response,
				{
					isAgent: request.location === 'tool',
					chatRequestId: request.chatRequestId,
					chatSessionId: request.chatSessionId,
					chatRequestSource: `api_${request.location}`,
					chatRequestModel: request.chatRequestModel,
				},
				token
			);

			if (result?.errorDetails) {
				errorMessages.push(result.errorDetails.message);
			}
		}

		if (errorMessages.length) {
			return { errorMessage: errorMessages.join('\n') };
		}
		return {};
	}
}
```

**Key point:** this provider *does not itself compute edits*. It delegates to the extension’s internal **CodeMapperService**.

---

# 3) CodeMapperService chooses a document vs notebook mapper
The service queues per‑file and then uses either **DocumentCodeMapper** or **NotebookCodeMapper**:

```typescript name=src/extension/prompts/node/codeMapper/codeMapperService.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapperService.ts#L57-L121
export class CodeMapperService extends Disposable implements ICodeMapperService {
	/* ... */

	async mapCode(request: IMapCodeRequest, responseStream: vscode.MappedEditsResponseStream, telemetryInfo: ICodeMapperTelemetryInfo | undefined, token: vscode.CancellationToken): Promise<IMapCodeResult | undefined> {
		let queue = this._queues.get(request.codeBlock.resource);
		if (!queue) {
			queue = new Queue<IMapCodeResult | undefined>();
			this._queues.set(request.codeBlock.resource, queue);
		}

		return queue.queue(() => this._doMapCode(request, responseStream, telemetryInfo, token));
	}

	private async _doMapCode(request: IMapCodeRequest, responseStream: vscode.MappedEditsResponseStream, telemetryInfo: ICodeMapperTelemetryInfo | undefined, token: vscode.CancellationToken): Promise<IMapCodeResult | undefined> {
		const codeMapper = this.notebookService.hasSupportedNotebooks(request.codeBlock.resource) ?
			this.instantiationService.createInstance(NotebookCodeMapper) :
			this.instantiationService.createInstance(DocumentCodeMapper);

		return codeMapper.mapCode(request, responseStream, telemetryInfo, token);
	}
}
```

---

# 4) DocumentCodeMapper handles fast paths + LLM fallback
For normal text documents:

- If the file is empty **and** there’s no “existing code marker”, it just emits the code block as a full edit.
- Otherwise, it uses the `CodeMapper` class to generate edits.

```typescript name=src/extension/prompts/node/codeMapper/codeMapperService.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapperService.ts#L86-L121
if ((!documentContext || (documentContext.getText().length === 0)) && !codeBlock.code.includes(EXISTING_CODE_MARKER)) {
	// Fast path: emit code block directly as a full edit
	responseStream.textEdit(codeBlock.resource, new TextEdit(new Range(0, 0, 0, 0), codeBlock.code));
	/* telemetry ... */
	return;
}
```

---

# 5) CodeMapper handles fast vs slow edit strategies
The main code‑mapper logic tries a “fast edit” first, then falls back to a full rewrite or patch rewrite using a chat endpoint.

```typescript name=src/extension/prompts/node/codeMapper/codeMapper.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapper.ts#L323-L389
const fastEdit = await this.mapCodeUsingFastEdit(request, resultStream, telemetryInfo, token);
if (!(fastEdit instanceof CodeMapperRefusal)) {
	return fastEdit;
}
// fallback: slow rewrite endpoint
const chatEndpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');

// choose full rewrite vs patch based on size
const doFullRewrite = /* ... */;

if (doFullRewrite) {
	responsePromise = processFullRewriteResponseCode(/* ... */);
} else {
	responsePromise = processPatchResponse(/* ... */);
}

// Build prompt and call model
const promptRenderer = PromptRenderer.create(
	this.instantiationService,
	chatEndpoint,
	doFullRewrite ? CodeMapperFullRewritePrompt : CodeMapperPatchRewritePrompt,
	{ request } satisfies CodeMapperPromptProps
);

const prompt = await promptRenderer.render(undefined, token);
const fetchResult = await chatEndpoint.makeChatRequest(/* ... */);
```

---

# ✅ Summary (how MappedEditsProvider2 works here)

1. **VS Code calls the provider** registered by Copilot Chat.
2. **AIMappedEditsProvider2** loops each code block and delegates to `CodeMapperService`.
3. **CodeMapperService** serializes per file and chooses **document vs notebook** mapper.
4. **DocumentCodeMapper** uses a **fast path** when possible.
5. Otherwise, **CodeMapper** runs a fast edit attempt, and if that fails, falls back to a **full rewrite** or **patch rewrite** using a model (default is `gpt-4.1`).
6. Edits are streamed back through the `MappedEditsResponseStream`.

---

Here’s how **slow rewrite mode** works in the Copilot Chat code‑mapper, based on the implementation in `codeMapper.ts`.

---

## 1) When slow rewrite is triggered
The code‑mapper first tries a “fast edit”. If that **refuses** (returns `CodeMapperRefusal`), it falls back to slow rewrite:

```typescript name=src/extension/prompts/node/codeMapper/codeMapper.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapper.ts#L323-L335
const fastEdit = await this.mapCodeUsingFastEdit(request, resultStream, telemetryInfo, token);
if (!(fastEdit instanceof CodeMapperRefusal)) {
	return fastEdit;
}
// continue with "slow rewrite endpoint" when fast rewriting was not possible
// use gpt-4.1 as fallback
const chatEndpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
```

---

## 2) It decides between **full rewrite** vs **patch rewrite**
The slow path chooses **full rewrite** if the document is small enough, otherwise it uses **patch rewrite**:

```typescript name=src/extension/prompts/node/codeMapper/codeMapper.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapper.ts#L335-L356
// Only attempt a full file rewrite if the original document fits into 3/4 of the max output token limit, leaving space for the model to add code.
const longestDocumentContext = isNewDocument(request)
	? request.workingSet.reduce<ICodeMapperDocument | undefined>((prev, curr) =>
		(prev && (prev.getText().length > curr.getText().length)) ? prev : curr, undefined)
	: request.existingDocument;

const doFullRewrite = longestDocumentContext
	? await chatEndpoint.acquireTokenizer().tokenLength(longestDocumentContext.getText()) < (4096 / 4 * 3)
	: true;
```

---

## 3) It streams edits from an LLM response
The response from the model is **streamed** and interpreted into edits:

- **Full rewrite:** `processFullRewriteResponseCode(...)`
- **Patch rewrite:** `processPatchResponse(...)`

```typescript name=src/extension/prompts/node/codeMapper/codeMapper.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapper.ts#L356-L383
if (doFullRewrite) {
	responsePromise = processFullRewriteResponseCode(
		request.uri,
		existingDocument,
		extractCodeBlock(fetchStreamSource.stream, token),
		resultStream,
		token
	);
} else {
	responsePromise = processPatchResponse(
		request.uri,
		existingDocument?.getText(),
		fetchStreamSource.stream,
		resultStream,
		token
	);
}
```

---

## 4) It renders a prompt and calls the model
A prompt is built with either a **full‑rewrite prompt** or a **patch‑rewrite prompt**, then sent to the model:

```typescript name=src/extension/prompts/node/codeMapper/codeMapper.ts url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/codeMapper/codeMapper.ts#L383-L389
const promptRenderer = PromptRenderer.create(
	this.instantiationService,
	chatEndpoint,
	doFullRewrite ? CodeMapperFullRewritePrompt : CodeMapperPatchRewritePrompt,
	{ request } satisfies CodeMapperPromptProps
);

const prompt = await promptRenderer.render(undefined, token);
const fetchResult = await chatEndpoint.makeChatRequest(
	'codeMapper',
	prompt.messages,
	cb,
	token,
	ChatLocation.Other,
	undefined,
	{ temperature: 0 }
);
```

---

# TL;DR — Slow rewrite mode
1. **Fast edit fails** → slow rewrite begins.
2. It chooses **full rewrite** (small file) or **patch rewrite** (large file).
3. The model response is streamed and **converted into edits**.
4. The edits are emitted to the response stream (text or notebook edits).

---

If you want, I can dive into:
- how **`processFullRewriteResponseCode`** and **`processPatchResponse`** interpret model output,
- or the **prompt templates** (`CodeMapperFullRewritePrompt` / `CodeMapperPatchRewritePrompt`) that guide the model.