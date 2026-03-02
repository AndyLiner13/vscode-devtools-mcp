/**
 * Phase 5 — Symbol enrichment.
 *
 * Enriches CodeChunks with TS Language Services metadata (call hierarchy,
 * type hierarchy, references, type flows, members, signature). This was
 * previously inlined in lookup/index.ts but belongs in the graph module
 * because the graph is the rendered form of this metadata.
 */

import { Node } from 'ts-morph';

import { resolveCallHierarchy } from '../ts-ls/call-hierarchy.js';
import { resolveTypeHierarchy } from '../ts-ls/type-hierarchy.js';
import { resolveReferences } from '../ts-ls/references.js';
import { resolveTypeFlows } from '../ts-ls/type-flows.js';
import { resolveMembers } from '../ts-ls/members.js';
import { resolveSignature } from '../ts-ls/signature.js';
import type { SymbolMetadata, SymbolRef, TsLsConfig } from '../ts-ls/types.js';
import type { CodeChunk } from '../chunker/types.js';

/**
 * Enrich a single chunk with TS LS structural metadata.
 * Uses the ts-morph Node directly from the chunker's nodeMap.
 */
export function enrichWithMetadata(
	node: Node | undefined,
	chunk: CodeChunk,
	tsLsConfig?: Partial<TsLsConfig>,
): SymbolMetadata {
	const symbolRef: SymbolRef = {
		name: chunk.parentName ? `${chunk.parentName}.${chunk.name}` : chunk.name,
		filePath: chunk.filePath,
		line: chunk.startLine,
	};

	const metadata: SymbolMetadata = {
		symbol: symbolRef,
		outgoingCalls: [],
		incomingCallers: [],
	};

	if (!node) return metadata;

	// Signature + modifiers (applicable to all kinds)
	try {
		const sigInfo = resolveSignature(node);
		metadata.signature = sigInfo.signature;
		metadata.modifiers = sigInfo.modifiers;
	} catch {
		// Not all symbols have resolvable signatures
	}

	// Call hierarchy (functions, methods, constructors)
	if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
		try {
			const callMeta = resolveCallHierarchy(node, tsLsConfig);
			metadata.outgoingCalls = callMeta.outgoingCalls;
			metadata.incomingCallers = callMeta.incomingCallers;
		} catch {
			// Call hierarchy may fail for some symbols
		}
	}

	// Type hierarchy (classes, interfaces)
	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
		try {
			metadata.typeHierarchy = resolveTypeHierarchy(node);
		} catch {
			// Not all classes/interfaces have resolvable type hierarchies
		}
	}

	// Members (classes, interfaces)
	if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
		try {
			metadata.members = resolveMembers(node);
		} catch {
			// Not all classes/interfaces have members
		}
	}

	// References (all named symbols — skip imports, expressions, re-exports, comments)
	const skipRefsKinds = new Set(['ImportDeclaration', 'ExpressionStatement', 'ExportDeclaration']);
	if (!skipRefsKinds.has(node.getKindName())) {
		try {
			metadata.references = resolveReferences(node);
		} catch {
			// References may fail for some symbols
		}
	}

	// Type flows (callable symbols)
	if (
		Node.isFunctionDeclaration(node)
		|| Node.isMethodDeclaration(node)
		|| Node.isConstructorDeclaration(node)
	) {
		try {
			metadata.typeFlows = resolveTypeFlows(node);
		} catch {
			// Type flows may fail for some symbols
		}
	}

	return metadata;
}
