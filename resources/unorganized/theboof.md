Below is what the repository shows about how the default **EditFile** tool is wired and what Copilot sends as input to it.

## What Copilot sends as input (EditFile tool schema)
The tool input is a small object with **explanation**, **filePath**, and **code**:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L30-L34
export interface IEditFileParams {
	explanation: string;
	filePath: string;
	code: string;
}
```

## How that input is handled by Copilot

### 1) Input is resolved and stored in prompt context
The tool stores the prompt context and returns the input unchanged. This is the first step before edits happen:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L108-L122
async resolveInput(input: IEditFileParams, promptContext: IBuildPromptContext): Promise<IEditFileParams> {
	this.promptContext = promptContext;
	return input;
}
```

### 2) The input is wrapped for confirmation UI
When a confirmation UI is needed, Copilot renders the `code` field into a fenced block for display:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L108-L122
prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IEditFileParams>, token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation> {
	const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
	return this.instantiationService.invokeFunction(
		createEditConfirmation,
		uri ? [uri] : [],
		this.promptContext?.allowedEditUris,
		async () => '```\n' + options.input.code + '\n```',
		options.forceConfirmationReason
	);
}
```

### 3) The tool resolves the file path and delegates to the internal edit tool
The tool resolves the `filePath`, checks diagnostics, and invokes the internal edit tool (`vscode_editFile_internal`). This is where the edit is actually applied:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L56-L79
async invoke(options: vscode.LanguageModelToolInvocationOptions<IEditFileParams>, token: vscode.CancellationToken) {
	const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
	if (!uri) {
		throw new Error(`Invalid file path`);
	}

	await this.instantiationService.invokeFunction(accessor => assertFileNotContentExcluded(accessor, uri));

	const existingDiagnostics = this.languageDiagnosticsService.getDiagnostics(uri);

	// Wait for vscode to do the edit, call the codemapper service, wait for textedits to be applied
	const internalOptions = {
		...options,
		input: {
			...options.input,
			uri
		}
	};
	try {
		await this.toolsService.invokeTool(InternalEditToolId, internalOptions, token);
		void this.recordEditSuccess(options, true);
	} catch (error) {
		void this.recordEditSuccess(options, false);
		throw error;
	}
	/*...*/
}
```

## Summary (direct answer)
- **Input sent by Copilot**: `{ explanation, filePath, code }` (see `IEditFileParams`).
- **Handling flow**:
  1. The input is accepted and stored with prompt context (`resolveInput`).
  2. The `code` is wrapped in a fenced block for confirmation (`prepareInvocation`).
  3. The `filePath` is resolved to a URI and passed into the **internal edit tool** (`vscode_editFile_internal`) which performs the actual edit (`invoke`).

---

From the repo, the `code` parameter is explicitly a **string** field on the tool’s input object. It’s not an object itself; it’s plain text (the edit content) carried inside a JSON-shaped tool input.

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L30-L34
export interface IEditFileParams {
	explanation: string;
	filePath: string;
	code: string;
}
```

So, **the tool input is a JSON-like object**, and `code` is just a **string** field inside that object. In the confirmation step, they wrap that string in a fenced code block for display, but it’s still plain text:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L108-L122
async () => '```\n' + options.input.code + '\n```',
```

---

Here’s what the repo shows about the **ReadFile** tool’s input and how Copilot handles it.

## What Copilot sends as input (schema)
The tool is defined with a JSON schema. `filePath` is required, and `offset`/`limit` are optional in v2:

```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L28-L47
export const readFileV2Description: vscode.LanguageModelToolInformation = {
	name: ToolName.ReadFile,
	description: 'Read the contents of a file. Line numbers are 1-indexed. This tool will truncate its output at 2000 lines and may be called repeatedly with offset and limit parameters to read larger files in chunks.',
	tags: ['vscode_codesearch'],
	source: undefined,
	inputSchema: {
		type: 'object',
		required: ['filePath'],
		properties: {
			filePath: {
				description: 'The absolute path of the file to read.',
				type: 'string'
			},
			offset: {
```

So the input is a **JSON object** with string `filePath` and optional numeric `offset`/`limit` (v2). It’s not a nested object for content—just parameters telling the tool what to read.

## How the input is handled

### 1) Input is resolved and stored in prompt context
Copilot stores the prompt context and returns the input unchanged:

```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L312-L315
async resolveInput(input: IReadFileParamsV1, promptContext: IBuildPromptContext): Promise<IReadFileParamsV1> {
	this._promptContext = promptContext;
	return input;
}
```

### 2) The file path is resolved and the requested range is computed
In `invoke`, Copilot resolves the path, opens a snapshot, computes the range, and returns a `ReadFileResult`:

```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L128-L156
async invoke(options: vscode.LanguageModelToolInvocationOptions<ReadFileParams>, token: vscode.CancellationToken) {
	let ranges: IParamRanges | undefined;
	let uri: URI | undefined;
	try {
		uri = resolveToolInputPath(options.input.filePath, this.promptPathRepresentationService);
		const documentSnapshot = await this.getSnapshot(uri);
		ranges = getParamRanges(options.input, documentSnapshot);

		void this.sendReadFileTelemetry('success', options, ranges, uri);
		const useCodeFences = this.configurationService.getExperimentBasedConfig<boolean>(ConfigKey.TeamInternal.ReadFileCodeFences, this.experimentationService);
		return new LanguageModelToolResult([
			new LanguageModelPromptTsxPart(
				await renderPromptElementJSON(
					this.instantiationService,
					ReadFileResult,
```

## Summary (direct answer)
- **Input format**: a JSON object with `filePath` (string) and optional range params (`offset`/`limit` in v2).
- **Handling**: Copilot resolves the file path, creates a snapshot, computes the requested range, and renders a `ReadFileResult`.

---

Here are the **ReadFile params (v1/v2)** and the **range calculation** logic from the repo.

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search: https://github.com/search?q=repo%3Amicrosoft%2Fvscode-copilot-chat%20symbol%3AIReadFileParamsV1%20OR%20symbol%3AIReadFileParamsV2%20OR%20symbol%3AReadFileParams%20OR%20symbol%3AgetParamRanges&type=code

## ReadFile param types (v1/v2) and max lines
```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L37-L76
export interface IReadFileParamsV1 {
	filePath: string;
	startLine: number;
	endLine: number;
}

export interface IReadFileParamsV2 {
	filePath: string;
	offset?: number;
	limit?: number;
}

const MAX_LINES_PER_READ = 2000;

export type ReadFileParams = IReadFileParamsV1 | IReadFileParamsV2;

const isParamsV2 = (params: ReadFileParams): params is IReadFileParamsV2 =>
	(params as IReadFileParamsV1).startLine === undefined;
```

## How `offset`/`limit` (v2) and `startLine`/`endLine` (v1) are handled
This shows how the tool clamps ranges, enforces max lines, and detects truncation:

```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L77-L121
const getParamRanges = (params: ReadFileParams, snapshot: NotebookDocumentSnapshot | TextDocumentSnapshot): IParamRanges => {
	let start: number;
	let end: number;
	let truncated = false;
	if (isParamsV2(params)) {
		// Check if offset is out of bounds before clamping
		if (params.offset !== undefined && params.offset > snapshot.lineCount) {
			throw new Error(`Invalid offset ${params.offset}: file only has ${snapshot.lineCount} line${snapshot.lineCount === 1 ? '' : 's'}. Line numbers are 1-indexed.`);
		}
		const limit = clamp(params.limit || Infinity, 1, MAX_LINES_PER_READ - 1);
		start = clamp(params.offset ?? 1, 1, snapshot.lineCount);
		end = clamp(start + limit, 1, snapshot.lineCount);
		// signal truncation if we applied a limit to the lines other than what the model requested
		truncated = limit !== params.limit && end < snapshot.lineCount;
	} else {
		start = clamp(params.startLine, 1, snapshot.lineCount);
		end = clamp(params.endLine, 1, snapshot.lineCount);
	}

	if (start > end) {
		[end, start] = [start, end];
	}

	return { start, end, truncated };
};
```

### Quick takeaways
- **V1** uses `startLine`/`endLine` and clamps to the file’s line count.
- **V2** uses `offset`/`limit`, enforces **MAX_LINES_PER_READ = 2000**, and sets a `truncated` flag if it had to clamp the limit.
- If `offset` is beyond the file size, it throws an error.

---

Here’s the **ReadFileResult** rendering code (the part that formats and emits the file contents back to the model).  

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search: https://github.com/search?q=repo%3Amicrosoft%2Fvscode-copilot-chat%20symbol%3AReadFileResult&type=code

```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L295-L377
interface ReadFileResultProps extends BasePromptElementProps {
	uri: URI;
	startLine: number;
	endLine: number;
	truncated: boolean;
	snapshot: TextDocumentSnapshot | NotebookDocumentSnapshot;
	languageModel: vscode.LanguageModelChat | undefined;
	useCodeFences: boolean;
}

class ReadFileResult extends PromptElement<ReadFileResultProps> {
	constructor(
		props: PromptElementProps<ReadFileResultProps>,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IPromptPathRepresentationService private readonly promptPathRepresentationService: IPromptPathRepresentationService,
	) {
		super(props);
	}

	override async render() {
		// Only check content exclusion (copilot ignore) - external file confirmation was already handled in prepareInvocation
		await this.instantiationService.invokeFunction(accessor => assertFileNotContentExcluded(accessor, this.props.uri));

		const documentSnapshot = this.props.snapshot;

		const documentText = documentSnapshot.getText();
		if (documentText.length === 0) {
			return <>(The file `{this.promptPathRepresentationService.getFilePath(this.props.uri)}` exists, but is empty)</>;
		} else if (documentText.trim().length === 0) {
			return <>(The file `{this.promptPathRepresentationService.getFilePath(this.props.uri)}` exists, but contains only whitespace)</>;
		}

		const range = new Range(
			this.props.startLine - 1, 0,
			this.props.endLine - 1, Infinity,
		);
		let contents = documentSnapshot.getText(range);

		if (this.props.truncated) {
			contents += `\n[File content truncated at line ${this.props.endLine}. Use ${ToolName.ReadFile} with offset/limit parameters to view more.]\n`;
		}

		return <>
			{this.props.useCodeFences && range.end.line + 1 !== documentSnapshot.lineCount || this.props.truncated ? <>File: `{this.promptPathRepresentationService.getFilePath(this.props.uri)}`. Lines {range.start.line + 1} to {range.end.line + 1} ({documentSnapshot.lineCount} lines total): <br /></> : undefined}
			<CodeBlock
				uri={this.props.uri}
				code={contents}
				languageId={documentSnapshot.languageId}
				shouldTrim={false}
				includeFilepath={false}
				references={[new PromptReference(this.props.uri, undefined, { isFromTool: true })]}
				lineBasedPriority
				fence={this.props.useCodeFences ? undefined : ''}
			/>
		</>;
	}
}
```

---

Here are the `invoke` and `prepareInvocation` methods for `ReadFileTool`.

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search: https://github.com/search?q=repo%3Amicrosoft%2Fvscode-copilot-chat%20path%3Asrc%2Fextension%2Ftools%2Fnode%2FreadFileTool.tsx&type=code

## `invoke`
```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L127-L312
async invoke(options: vscode.LanguageModelToolInvocationOptions<ReadFileParams>, token: vscode.CancellationToken) {
	let ranges: IParamRanges | undefined;
	let uri: URI | undefined;
	try {
		uri = resolveToolInputPath(options.input.filePath, this.promptPathRepresentationService);
		const documentSnapshot = await this.getSnapshot(uri);
		ranges = getParamRanges(options.input, documentSnapshot);

		void this.sendReadFileTelemetry('success', options, ranges, uri);
		const useCodeFences = this.configurationService.getExperimentBasedConfig<boolean>(ConfigKey.TeamInternal.ReadFileCodeFences, this.experimentationService);
		return new LanguageModelToolResult([
			new LanguageModelPromptTsxPart(
				await renderPromptElementJSON(
					this.instantiationService,
					ReadFileResult,
					{ uri, startLine: ranges.start, endLine: ranges.end, truncated: ranges.truncated, snapshot: documentSnapshot, languageModel: this._promptContext?.request?.model, useCodeFences },
					// If we are not called with tokenization options, have _some_ fake tokenizer
					// otherwise we end up returning the entire document on every readFile.
					options.tokenizationOptions ?? {
						tokenBudget: 600,
						countTokens: (t) => Promise.resolve(t.length * 3 / 4)
					},
					token,
				),
			)
		]);
	} catch (err) {
		void this.sendReadFileTelemetry('error', options, ranges || { start: 0, end: 0, truncated: false }, uri);
		throw err;
	}
}
```

## `prepareInvocation`
```tsx name=src/extension/tools/node/readFileTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/readFileTool.tsx#L156-L255
async prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ReadFileParams>, token: vscode.CancellationToken): Promise<vscode.PreparedToolInvocation | undefined> {
	const { input } = options;
	if (!input.filePath.length) {
		return;
	}

	let uri: URI | undefined;
	let documentSnapshot: NotebookDocumentSnapshot | TextDocumentSnapshot;
	try {
		uri = resolveToolInputPath(input.filePath, this.promptPathRepresentationService);

		// Check if file is external (outside workspace, not open in editor, etc.)
		const isExternal = await this.instantiationService.invokeFunction(
			accessor => isFileExternalAndNeedsConfirmation(accessor, uri!, { readOnly: true })
		);

		if (isExternal) {
			// Still check content exclusion (copilot ignore)
			await this.instantiationService.invokeFunction(
				accessor => assertFileNotContentExcluded(accessor, uri!)
			);

			const folderUri = dirname(uri);

			const message = this.workspaceService.getWorkspaceFolders().length === 1 ? new MarkdownString(l10n.t`${formatUriForFileWidget(uri)} is outside of the current folder in ${formatUriForFileWidget(folderUri)}.`) : new MarkdownString(l10n.t`${formatUriForFileWidget(uri)} is outside of the current workspace in ${formatUriForFileWidget(folderUri)}.`);

			// Return confirmation request for external file
			// The folder-based "allow this session" option is provided by the core confirmation contribution
			return {
				invocationMessage: new MarkdownString(l10n.t`Reading ${formatUriForFileWidget(uri)}`),
				pastTenseMessage: new MarkdownString(l10n.t`Read ${formatUriForFileWidget(uri)}`),
				confirmationMessages: {
					title: l10n.t`Allow reading external files?`,
					message,
				}
			};
		}

		await this.instantiationService.invokeFunction(accessor => assertFileOkForTool(accessor, uri!, this._promptContext, { readOnly: true }));
		documentSnapshot = await this.getSnapshot(uri);
	} catch (err) {
		void this.sendReadFileTelemetry('invalidFile', options, { start: 0, end: 0, truncated: false }, uri);
		throw err;
	}

	const { start, end } = getParamRanges(input, documentSnapshot);

	// Refresh available extension prompt files only if reading a skill.md file (can be file or virtual URI)
	if (extUriBiasedIgnorePathCase.basename(uri).toLowerCase() === 'skill.md') {
		await this.customInstructionsService.refreshExtensionPromptFiles();
	}
	const skillInfo = this.customInstructionsService.getSkillInfo(uri);

	if (start === 1 && end === documentSnapshot.lineCount) {
		if (skillInfo) {
			const { skillName } = skillInfo;
			if (this.customInstructionsService.isSkillMdFile(uri)) {
				return {
					invocationMessage: new MarkdownString(l10n.t`Reading skill ${formatUriForFileWidget(uri, { vscodeLinkType: 'skill', linkText: skillName })}`),
					pastTenseMessage: new MarkdownString(l10n.t`Read skill ${formatUriForFileWidget(uri, { vscodeLinkType: 'skill', linkText: skillName })}`),
				};
			} else {
				return {
					invocationMessage: new MarkdownString(l10n.t`Reading skill \`${skillName}\`: ${formatUriForFileWidget(uri)}`),
					pastTenseMessage: new MarkdownString(l10n.t`Read skill \`${skillName}\`: ${formatUriForFileWidget(uri)}`),
				};
			}
		}
		return {
			invocationMessage: new MarkdownString(l10n.t`Reading ${formatUriForFileWidget(uri)}`),
			pastTenseMessage: new MarkdownString(l10n.t`Read ${formatUriForFileWidget(uri)}`),
		};
	}

	// Jump to the start of the range, don't select the whole range
	const readLocation = new Location(uri, new Range(start - 1, 0, start - 1, 0));
	if (this.customInstructionsService.isSkillFile(uri)) {
		if (skillInfo) {
			const { skillName } = skillInfo;
			if (this.customInstructionsService.isSkillMdFile(uri)) {
				return {
					invocationMessage: new MarkdownString(l10n.t`Reading skill ${formatUriForFileWidget(readLocation, { vscodeLinkType: 'skill', linkText: skillName })}, lines ${start} to ${end}`),
					pastTenseMessage: new MarkdownString(l10n.t`Read skill ${formatUriForFileWidget(readLocation, { vscodeLinkType: 'skill', linkText: skillName })}, lines ${start} to ${end}`),
				};
			} else {
				return {
					invocationMessage: new MarkdownString(l10n.t`Reading skill \`${skillName}\`: ${formatUriForFileWidget(readLocation)}, lines ${start} to ${end}`),
					pastTenseMessage: new MarkdownString(l10n.t`Read skill \`${skillName}\`: ${formatUriForFileWidget(readLocation)}, lines ${start} to ${end}`),
				};
			}
		}
	}
	return {
		invocationMessage: new MarkdownString(l10n.t`Reading ${formatUriForFileWidget(readLocation)}, lines ${start} to ${end}`),
		pastTenseMessage: new MarkdownString(l10n.t`Read ${formatUriForFileWidget(readLocation)}, lines ${start} to ${end}`),
	};
}
```

---

Below is a concise, end‑to‑end overview of **EditFileTool** in `microsoft/vscode-copilot-chat`, with the key entry points and how they fit together. (If you want deeper dives into any helper, say the word.)

---

## 1) Input schema (what Copilot sends)
The tool expects **plain strings** for the path, explanation, and code:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L17-L34
export interface IEditFileParams {
	explanation: string;
	filePath: string;
	code: string;
}
```

---

## 2) Tool registration + class definition
The tool is implemented in `insertEditTool.tsx`:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L17-L132
export class EditFileTool implements ICopilotTool<IEditFileParams> {
	public static toolName = ToolName.EditFile;
	private promptContext?: IBuildPromptContext;
	/* ... */
}

ToolRegistry.registerTool(EditFileTool);
```

---

## 3) `resolveInput` (stores prompt context, returns input)
```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L108-L122
async resolveInput(input: IEditFileParams, promptContext: IBuildPromptContext): Promise<IEditFileParams> {
	this.promptContext = promptContext;
	return input;
}
```

---

## 4) `prepareInvocation` (confirmation UX)
For confirmation, Copilot wraps the **`code` string** in fences:

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L108-L122
prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<IEditFileParams>, token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation> {
	const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
	return this.instantiationService.invokeFunction(
		createEditConfirmation,
		uri ? [uri] : [],
		this.promptContext?.allowedEditUris,
		async () => '```\n' + options.input.code + '\n```',
		options.forceConfirmationReason
	);
}
```

---

## 5) `invoke` (core edit flow)
This does the work:
- resolves the `filePath`
- validates exclusion rules
- invokes the **internal** edit tool (`vscode_editFile_internal`)
- opens the updated document snapshot
- returns an `EditFileResult` prompt element

```tsx name=src/extension/tools/node/insertEditTool.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/insertEditTool.tsx#L56-L105
async invoke(options: vscode.LanguageModelToolInvocationOptions<IEditFileParams>, token: vscode.CancellationToken) {
	const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
	if (!uri) {
		throw new Error(`Invalid file path`);
	}

	await this.instantiationService.invokeFunction(accessor => assertFileNotContentExcluded(accessor, uri));

	const existingDiagnostics = this.languageDiagnosticsService.getDiagnostics(uri);

	// Wait for vscode to do the edit, call the codemapper service, wait for textedits to be applied
	const internalOptions = {
		...options,
		input: {
			...options.input,
			uri
		}
	};
	try {
		await this.toolsService.invokeTool(InternalEditToolId, internalOptions, token);
		void this.recordEditSuccess(options, true);
	} catch (error) {
		void this.recordEditSuccess(options, false);
		throw error;
	}
	/* ... */
}
```

---

## 6) Tool result rendering (`EditFileResult`)
After edits, the tool builds a result object describing the edit outcome and diagnostics:

```tsx name=src/extension/tools/node/editFileToolResult.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/editFileToolResult.tsx#L58-L77
export class EditFileResult extends PromptElement<IEditFileResultProps> {
	override async render(state: void, sizing: PromptSizing) {
		const successfullyEditedFiles: string[] = [];
		const editingErrors: string[] = [];
		const editsWithDiagnostics: { file: string; diagnostics: PromptElement }[] = [];
		const healedEdits: { file: string; healing: string }[] = [];
		let totalNewDiagnostics = 0;
		let filesWithNewDiagnostics = 0;
		let notebookEditFailures = 0;
		for (const file of this.props.files) {
			if (file.error) {
				editingErrors.push(file.error);
				if (file.isNotebook) {
					notebookEditFailures++;
				}
				continue;
			}

			const filePath = this.promptPathRepresentationService.getFilePath(file.uri);
			if (file.healed) {
				healedEdits.push({ file: filePath, healing: file.healed });
			}
			/* ... */
		}
	}
}
```

---

## 7) Underlying edit application logic
Edits eventually rely on helpers like `applyEdit` (string-based patching and file insertion):

```tsx name=src/extension/tools/node/editFileToolUtils.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/tools/node/editFileToolUtils.tsx#L670-L702
export async function applyEdit(
	uri: URI,
	old_string: string,
	new_string: string,
	workspaceService: IWorkspaceService,
	notebookService: INotebookService,
	alternativeNotebookContent: IAlternativeNotebookContentService,
	languageModel: LanguageModelChat | undefined,
	opts?: { replaceAll?: boolean },
): Promise<{ patch: Hunk[]; updatedFile: string; edits: TextEdit[] }> {
	/* ... */
	if (old_string === '' && error.code === 'ENOENT') {
		originalFile = '';
		updatedFile = new_string;

		const patch = getPatch({
			fileContents: originalFile,
			oldStr: originalFile,
			newStr: updatedFile,
		});

		edits.push(TextEdit.insert(new Position(0, 0), new_string));
		return { patch, updatedFile, edits };
	}
	/* ... */
}
```

---

## 8) Prompt guidance to models
Some prompts explicitly instruct models to use the tool and provide minimal hints:

```tsx name=src/extension/prompts/node/panel/editCodePrompt2.tsx url=https://github.com/microsoft/vscode-copilot-chat/blob/98c73e5a458ac35195333426dae447d044f69313/src/extension/prompts/node/panel/editCodePrompt2.tsx#L82-L91
For each file, give a short description of what needs to be changed, then use the {ToolName.EditFile} tool. You can use any tool multiple times in a response, and you can keep writing text after using a tool.<br />
The {ToolName.EditFile} tool is very smart and can understand how to apply your edits to their files, you just need to provide minimal hints.<br />
Avoid repeating existing code, instead use comments to represent regions of unchanged code. The tool prefers that you are as concise as possible.
```

---

Below is a walk‑through of the **internal edit tool** implementation (`vscode_editFile_internal`) from the `microsoft/vscode` repo.

> Note: the search tool only returns up to 10 results, so results may be incomplete. You can view more in GitHub code search:  
> https://github.com/search?q=repo%3Amicrosoft%2Fvscode%20vscode_editFile_internal&type=code

---

## Where the internal tool is defined
The internal tool lives in:

```
src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts
```

It defines:

- **`InternalEditToolId = 'vscode_editFile_internal'`**
- **`EditTool`** class that implements the internal tool

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L18-L144
export const InternalEditToolId = 'vscode_editFile_internal';

export interface EditToolParams {
	uri: UriComponents;
	explanation: string;
	code: string;
}

export class EditTool implements IToolImpl {
	/* ... */
}
```

---

## Step‑by‑step: what the internal tool does

### 1) Validate invocation context + resolve URI
It requires a tool invocation context, then revives the URI. If the URI points to a notebook cell, it normalizes to the notebook URI.

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L41-L84
if (!invocation.context) {
	throw new Error('toolInvocationToken is required for this tool');
}

const parameters = invocation.parameters as EditToolParams;
const fileUri = URI.revive(parameters.uri);
const uri = CellUri.parse(fileUri)?.notebook || fileUri;
```

---

### 2) Emit “editing started” progress to the chat model
It sends progress events to the `ChatModel` so the UI can show edit activity and associate edits with the file.

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L50-L79
model.acceptResponseProgress(request, {
	kind: 'markdownContent',
	content: new MarkdownString('\n````\n')
});
model.acceptResponseProgress(request, {
	kind: 'codeblockUri',
	uri,
	isEdit: true
});
model.acceptResponseProgress(request, {
	kind: 'markdownContent',
	content: new MarkdownString('\n````\n')
});
// Signal start.
if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
	model.acceptResponseProgress(request, { kind: 'notebookEdit', edits: [], uri });
} else {
	model.acceptResponseProgress(request, { kind: 'textEdit', edits: [], uri });
}
```

---

### 3) Use the **Code Mapper** to compute edits
The tool calls `codeMapperService.mapCode` with the **code** and **explanation** provided by Copilot.  
The callback streams edits back into the model as they are produced.

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L86-L99
const result = await this.codeMapperService.mapCode({
	codeBlocks: [{ code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation }],
	location: 'tool',
	chatRequestId: invocation.chatRequestId,
	chatRequestModel: invocation.modelId,
	chatSessionResource: invocation.context.sessionResource,
}, {
	textEdit: (target, edits) => {
		model.acceptResponseProgress(request, { kind: 'textEdit', uri: target, edits });
	},
	notebookEdit(target, edits) {
		model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: target, edits });
	},
}, token);
```

---

### 4) Signal “edit done” to the UI
Once mapping finishes, it emits a “done” event.

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L101-L106
if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
	model.acceptResponseProgress(request, { kind: 'notebookEdit', uri, edits: [], done: true });
} else {
	model.acceptResponseProgress(request, { kind: 'textEdit', uri, edits: [], done: true });
}
```

---

### 5) Wait for the edit to finish applying
It watches the **editing session** until the file stops being modified.

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L112-L132
let dispose: IDisposable;
await new Promise((resolve) => {
	let wasFileBeingModified = false;

	dispose = autorun((r) => {
		const entries = editSession.entries.read(r);
		const currentFile = entries?.find((e) => e.modifiedURI.toString() === uri.toString());
		if (currentFile) {
			if (currentFile.isCurrentlyBeingModifiedBy.read(r)) {
				wasFileBeingModified = true;
			} else if (wasFileBeingModified) {
				resolve(true);
			}
		}
	});
}).finally(() => {
	dispose.dispose();
});
```

---

### 6) Return a success message
```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L134-L136
return {
	content: [{ kind: 'text', value: 'The file was edited successfully' }]
};
```

---

## Summary of the internal tool
- **Entry**: `EditTool.invoke()`
- **Inputs**: `{ uri, explanation, code }`
- **Core engine**: `codeMapperService.mapCode`
- **Output**: streamed text/notebook edits, plus a final success response
- **Special handling**: waits for actual edit completion before returning

---

Below is the **code‑mapper path** used by the internal edit tool, showing how the tool’s `code` string is turned into edits. I’ve kept it tied to actual code in `microsoft/vscode`.

---

# 1) EditTool calls CodeMapperService
The internal tool hands `code` + `explanation` to `codeMapperService.mapCode(...)`:

```typescript name=src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/tools/builtinTools/editFileTool.ts#L86-L99
const result = await this.codeMapperService.mapCode({
	codeBlocks: [{ code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation }],
	location: 'tool',
	chatRequestId: invocation.chatRequestId,
	chatRequestModel: invocation.modelId,
	chatSessionResource: invocation.context.sessionResource,
}, {
	textEdit: (target, edits) => {
		model.acceptResponseProgress(request, { kind: 'textEdit', uri: target, edits });
	},
	notebookEdit(target, edits) {
		model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: target, edits });
	},
}, token);
```

---

# 2) CodeMapperService delegates to a registered provider
`CodeMapperService` is just a dispatcher: it calls the first registered provider and returns its result.

```typescript name=src/vs/workbench/contrib/chat/common/editing/chatCodeMapperService.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/contrib/chat/common/editing/chatCodeMapperService.ts#L50-L77
export class CodeMapperService implements ICodeMapperService {
	_serviceBrand: undefined;

	public readonly providers: ICodeMapperProvider[] = [];

	registerCodeMapperProvider(handle: number, provider: ICodeMapperProvider): IDisposable {
		this.providers.push(provider);
		return {
			dispose: () => {
				const index = this.providers.indexOf(provider);
				if (index >= 0) {
					this.providers.splice(index, 1);
				}
			}
		};
	}

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
}
```

---

# 3) The provider is registered via the extension host bridge
The main thread registers a provider that forwards to the **extension host**:

```typescript name=src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/browser/mainThreadChatCodeMapper.ts#L31-L46
$registerCodeMapperProvider(handle: number, displayName: string): void {
	const impl: ICodeMapperProvider = {
		displayName,
		mapCode: async (uiRequest: ICodeMapperRequest, response: ICodeMapperResponse, token: CancellationToken) => {
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
			try {
				return await this._proxy.$mapCode(handle, extHostRequest, token).then((result) => result ?? undefined);
			} finally {
				/* ... */
			}
		}
	};
	/* ... */
}
```

---

# 4) Extension host receives the request and calls the provider
The extension host takes the request, wraps a response stream, and calls `provideMappedEdits` on the actual provider:

```typescript name=src/vs/workbench/api/common/extHostCodeMapper.ts url=https://github.com/microsoft/vscode/blob/71292f2ef33b14ba57e36411bcbbd89e3e6c2041/src/vs/workbench/api/common/extHostCodeMapper.ts#L29-L68
async $mapCode(handle: number, internalRequest: extHostProtocol.ICodeMapperRequestDto, token: CancellationToken): Promise<ICodeMapperResult | null> {
	const provider = this.providers.get(handle);
	if (!provider) {
		throw new Error(`Received request to map code for unknown provider handle ${handle}`);
	}

	const stream: vscode.MappedEditsResponseStream = {
		textEdit: (target: vscode.Uri, edits: vscode.TextEdit | vscode.TextEdit[]) => {
			edits = asArray(edits);
			this._proxy.$handleProgress(internalRequest.requestId, {
				uri: target,
				edits: edits.map(TextEdit.from)
			});
		},
		notebookEdit: (target: vscode.Uri, edits: vscode.NotebookEdit | vscode.NotebookEdit[]) => {
			edits = asArray(edits);
			/* ... */
		}
	};

	const request: vscode.MappedEditsRequest = {
		location: internalRequest.location,
		chatRequestId: internalRequest.chatRequestId,
		chatRequestModel: internalRequest.chatRequestModel,
		chatSessionId: internalRequest.chatSessionResource ? LocalChatSessionUri.parseLocalSessionId(URI.revive(internalRequest.chatSessionResource)) : undefined,
		codeBlocks: internalRequest.codeBlocks.map(block => {
			return {
				code: block.code,
				resource: URI.revive(block.resource),
				markdownBeforeBlock: block.markdownBeforeBlock
			};
		})
	};

	const result = await provider.provideMappedEdits(request, stream, token);
	return result ?? null;
}
```

---

# 5) Progress is streamed back to the main thread and then to the chat model
Main thread receives progress events and forwards them to the response handlers (text edits or notebook edits):

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

# TL;DR (flow summary)

1. **EditTool.invoke** calls `codeMapperService.mapCode(...)`.
2. **CodeMapperService** forwards to the first registered provider.
3. **MainThreadChatCodeMapper** registers a provider that proxies to **ExtHostCodeMapper**.
4. **ExtHostCodeMapper** calls `provideMappedEdits` in the extension host.
5. Edits are streamed back and applied via progress events.

