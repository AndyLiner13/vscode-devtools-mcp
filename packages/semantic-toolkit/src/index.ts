export {
	extractFileSymbols,
	extractRootContent,
	extractSignature,
	parseFile,
	parseFiles,
	parseSource,
	PARSEABLE_EXTENSIONS,
} from './parser/index';

export type {
	ParsedFile,
	ParsedSymbol,
	SymbolRange,
} from './parser/index';

export { chunkFile } from './chunker/index';

export type { CodeChunk, ChunkedFile } from './chunker/types';

export { lookupSymbol } from './lookup/index';

export type {
	LookupResult,
	SymbolLookupResult,
	NotALookupResult,
} from './lookup/types';

export type { TsLsConfig } from './ts-ls/types';
export { DEFAULT_TS_LS_CONFIG } from './ts-ls/types';
