export {
	extractFileSymbols,
	extractRootContent,
	extractSignature,
	parseFile,
	parseFiles,
	parseSource,
	PARSEABLE_EXTENSIONS,
} from './parser/index.js';

export type {
	ParsedFile,
	ParsedSymbol,
	SymbolRange,
} from './parser/index.js';

export { chunkFile } from './chunker/index.js';

export type { CodeChunk, ChunkedFile } from './chunker/types.js';

export { lookupSymbol } from './lookup/index.js';

export type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
} from './lookup/types.js';

export type { TsLsConfig } from './ts-ls/types.js';
export { DEFAULT_TS_LS_CONFIG } from './ts-ls/types.js';
