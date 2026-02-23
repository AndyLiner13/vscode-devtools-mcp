// IMPORTANT: DO NOT use any VS Code proposed APIs in this file.

// Re-export chunker
export { chunkFile, chunkSymbols } from './chunker';

export { findDuplicates } from './duplicate-detection-service';

export { getExports } from './exports-service';

// Re-export file utilities
export { discoverFiles, readFileText, getPathType } from './file-utils';

// Re-export ignore rules
export { parseIgnoreRules, applyIgnoreRules } from './ignore-rules';

export { getImportGraph } from './import-graph-service';

// Re-export language service registry
export { LanguageServiceRegistry } from './language-service-registry';
export type { LanguageService } from './language-service-registry';

// Re-export language services
export { TypeScriptLanguageService } from './language-services';
export { MarkdownLanguageService } from './language-services';

// Re-export markdown parser
export { parseMarkdown, extractMarkdownStructure } from './markdown';

export { extractOrphanedContent } from './orphaned-content';

export type { OrphanedContentResult } from './orphaned-content';
// Re-export service functions
export { getOverview } from './overview-service';
// Re-export custom parsers
export { getCustomParser } from './parsers';
export { traceSymbol, findDeadCode } from './trace-symbol-service';
// Re-export ts-morph project helpers
export { getTsProject, getWorkspaceProject } from './ts-project';
// Re-export all types
export type {
  OverviewParams,
  OverviewResult,
  TreeNode,
  SymbolNode,
  ExportsParams,
  ExportInfo,
  ExportsResult,
  TraceSymbolParams,
  TraceSymbolResult,
  SymbolLocationInfo,
  ReferenceInfo,
  ReExportInfo,
  CallChainNode,
  CallChainInfo,
  TypeFlowInfo,
  ImpactDependentInfo,
  ImpactInfo,
  TypeHierarchyNode,
  TypeHierarchyInfo,
  DeadCodeParams,
  DeadCodeResult,
  DeadCodeItem,
  ImportGraphParams,
  ImportGraphResult,
  ImportGraphModule,
  CircularChain,
  DuplicateDetectionParams,
  DuplicateDetectionResult,
  DuplicateGroup,
  DuplicateInstance,
  FileSymbol,
  FileSymbolRange,
  FileStructure,
  FileStructureStats,
  OrphanedCategory,
  OrphanedItem,
  OrphanedContent,
} from './types';
export { TS_PARSEABLE_EXTS } from './types';
