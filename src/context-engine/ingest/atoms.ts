/**
 * atoms.ts
 * Atom extraction from chunks - entities, concepts, and relationships
 * Implements intelligent atom extraction for various content types
 */

import type { Atom, AtomType, Chunk } from '../types.js';

export interface AtomExtractionOptions {
	extractEntities: boolean;
	extractConcepts: boolean;
	extractRelationships: boolean;
	extractCodeElements: boolean;
	extractMarkdownElements: boolean;
	minConfidence: number;
	maxAtomsPerChunk: number;
}

export interface ExtractionResult {
	atoms: Atom[];
	confidence: number;
	extractionTime: number;
	metadata: {
		entitiesFound: number;
		conceptsFound: number;
		relationshipsFound: number;
		codeElementsFound: number;
		markdownElementsFound: number;
	};
}

export class AtomExtractor {
	constructor(private options: AtomExtractionOptions = {
		extractEntities: true,
		extractConcepts: true,
		extractRelationships: true,
		extractCodeElements: true,
		extractMarkdownElements: true,
		minConfidence: 0.7,
		maxAtomsPerChunk: 50
	}) {}

	/**
	 * Extract atoms from a chunk of text
	 */
	async extractAtoms(chunk: Chunk): Promise<ExtractionResult> {
		const startTime = Date.now();
		const atoms: Atom[] = [];

		try {
			// Extract different types of atoms based on chunk type
			if (chunk.metadata?.chunkType === 'code') {
				const codeAtoms = await this.extractCodeAtoms(chunk);
				atoms.push(...codeAtoms);
			} else if (chunk.metadata?.chunkType === 'markdown') {
				const markdownAtoms = await this.extractMarkdownAtoms(chunk);
				atoms.push(...markdownAtoms);
			} else {
				const textAtoms = await this.extractTextAtoms(chunk);
				atoms.push(...textAtoms);
			}

			// Limit atoms per chunk
			if (atoms.length > this.options.maxAtomsPerChunk) {
				atoms.splice(this.options.maxAtomsPerChunk);
			}

			// Calculate confidence based on extraction quality
			const confidence = this.calculateConfidence(atoms, chunk);

			// Filter by minimum confidence
			const filteredAtoms = atoms.filter(atom => atom.confidence >= this.options.minConfidence);

			const extractionTime = Date.now() - startTime;

			return {
				atoms: filteredAtoms,
				confidence,
				extractionTime,
				metadata: {
					entitiesFound: filteredAtoms.filter(a => a.type === 'ENT').length,
					conceptsFound: filteredAtoms.filter(a => a.type === 'REL').length,
					relationshipsFound: filteredAtoms.filter(a => a.type === 'REL').length,
					codeElementsFound: filteredAtoms.filter(a => a.type === 'ENT').length,
					markdownElementsFound: filteredAtoms.filter(a => a.type === 'ENT').length
				}
			};
		} catch (error) {
			console.error('Error extracting atoms:', error);
			return {
				atoms: [],
				confidence: 0,
				extractionTime: Date.now() - startTime,
				metadata: {
					entitiesFound: 0,
					conceptsFound: 0,
					relationshipsFound: 0,
					codeElementsFound: 0,
					markdownElementsFound: 0
				}
			};
		}
	}

	/**
	 * Extract atoms from code chunks
	 */
	private async extractCodeAtoms(chunk: Chunk): Promise<Atom[]> {
		const atoms: Atom[] = [];
		const text = chunk.text;
		const language = chunk.metadata?.language || 'unknown';
		const chunkId: string = chunk.id || `chunk_${Date.now()}`;

		// Extract function definitions
		const functionMatches = this.extractFunctions(text, language);
		functionMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.name,
				confidence: 0.9,
				metadata: {
					elementType: 'function',
					language,
					signature: match.signature,
					parameters: match.parameters,
					returnType: match.returnType,
					startLine: match.startLine,
					endLine: match.endLine
				},
				provenance: {
					offset: match.startLine,
					length: match.endLine - match.startLine + 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract class definitions
		const classMatches = this.extractClasses(text, language);
		classMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.name,
				confidence: 0.9,
				metadata: {
					elementType: 'class',
					language,
					inheritance: match.inheritance,
					interfaces: match.interfaces,
					methods: match.methods,
					properties: match.properties,
					startLine: match.startLine,
					endLine: match.endLine
				},
				provenance: {
					offset: match.startLine,
					length: match.endLine - match.startLine + 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract variable declarations
		const variableMatches = this.extractVariables(text, language);
		variableMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.name,
				confidence: 0.8,
				metadata: {
					elementType: 'variable',
					language,
					type: match.type,
					value: match.value,
					scope: match.scope,
					line: match.line
				},
				provenance: {
					offset: match.line,
					length: 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract import statements
		const importMatches = this.extractImports(text, language);
		importMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.module,
				confidence: 0.95,
				metadata: {
					elementType: 'import',
					language,
					module: match.module,
					items: match.items,
					alias: match.alias,
					line: match.line
				},
				provenance: {
					offset: match.line,
					length: 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		return atoms;
	}

	/**
	 * Extract atoms from Markdown chunks
	 */
	private async extractMarkdownAtoms(chunk: Chunk): Promise<Atom[]> {
		const atoms: Atom[] = [];
		const text = chunk.text;
		const chunkId: string = chunk.id || `chunk_${Date.now()}`;

		// Extract headers
		const headerMatches = this.extractHeaders(text);
		headerMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.text,
				confidence: 0.95,
				metadata: {
					elementType: 'header',
					level: match.level,
					line: match.line,
					section: match.text
				},
				provenance: {
					offset: match.line,
					length: 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract links
		const linkMatches = this.extractLinks(text);
		linkMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.text,
				confidence: 0.9,
				metadata: {
					elementType: 'link',
					url: match.url,
					text: match.text,
					line: match.line
				},
				provenance: {
					offset: match.line,
					length: 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract code blocks
		const codeBlockMatches = this.extractCodeBlocks(text);
		codeBlockMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_codeblock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.language || 'code',
				confidence: 0.9,
				metadata: {
					elementType: 'code_block',
					language: match.language,
					content: match.content,
					startLine: match.startLine,
					endLine: match.endLine
				},
				provenance: {
					offset: match.startLine,
					length: match.endLine - match.startLine + 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract lists
		const listMatches = this.extractLists(text);
		listMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.type,
				confidence: 0.85,
				metadata: {
					elementType: 'list',
					type: match.type,
					items: match.items,
					startLine: match.startLine,
					endLine: match.endLine
				},
				provenance: {
					offset: match.startLine,
					length: match.endLine - match.startLine + 1
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		return atoms;
	}

	/**
	 * Extract atoms from plain text chunks
	 */
	private async extractTextAtoms(chunk: Chunk): Promise<Atom[]> {
		const atoms: Atom[] = [];
		const text = chunk.text;
		const chunkId: string = chunk.id || `chunk_${Date.now()}`;

		// Extract named entities (simple pattern-based approach)
		const entityMatches = this.extractNamedEntities(text);
		entityMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'ENT',
				text: match.text,
				confidence: match.confidence,
				metadata: {
					entityType: match.type,
					confidence: match.confidence,
					position: match.position
				},
				provenance: {
					offset: match.position,
					length: match.text.length
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract key concepts (based on frequency and importance)
		const conceptMatches = this.extractKeyConcepts(text);
		conceptMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'REL',
				text: match.text,
				confidence: match.confidence,
				metadata: {
					importance: match.importance,
					frequency: match.frequency,
					context: match.context
				},
				provenance: {
					offset: text.indexOf(match.text),
					length: match.text.length
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		// Extract relationships between entities
		const relationshipMatches = this.extractRelationships(text);
		relationshipMatches.forEach(match => {
			atoms.push({
				id: `${chunkId}_rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				chunkId: chunkId,
				type: 'REL',
				text: match.relation,
				confidence: match.confidence,
				metadata: {
					entity1: match.entity1,
					entity2: match.entity2,
					relation: match.relation,
					confidence: match.confidence
				},
				provenance: {
					offset: text.indexOf(match.relation),
					length: match.relation.length
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		});

		return atoms;
	}

	/**
	 * Extract function definitions from code
	 */
	private extractFunctions(text: string, language: string): Array<{
		name: string;
		signature: string;
		parameters: string[];
		returnType: string;
		startLine: number;
		endLine: number;
	}> {
		const functions: Array<{
			name: string;
			signature: string;
			parameters: string[];
			returnType: string;
			startLine: number;
			endLine: number;
		}> = [];

		const lines = text.split('\n');
		let inFunction = false;
		let currentFunction: any = null;
		let braceCount = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Function declaration patterns
			if (language === 'javascript' || language === 'typescript') {
				const funcMatch = trimmed.match(/^(export\s+)?(async\s+)?(function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*)?\(|(\w+)\s*\([^)]*\)\s*[:=]\s*(?:async\s+)?(?:function\s*)?\()/);
				if (funcMatch) {
					const name = funcMatch[4] || funcMatch[5] || funcMatch[6];
					const signature = trimmed;
					const parameters = this.extractParameters(trimmed);
					const returnType = this.extractReturnType(trimmed, language);

					currentFunction = {
						name,
						signature,
						parameters,
						returnType,
						startLine: i + 1,
						endLine: i + 1
					};
					inFunction = true;
					braceCount = 0;
				}
			} else if (language === 'python') {
				const funcMatch = trimmed.match(/^def\s+(\w+)\s*\([^)]*\)/);
				if (funcMatch) {
					const name = funcMatch[1];
					const signature = trimmed;
					const parameters = this.extractParameters(trimmed);
					const returnType = this.extractReturnType(trimmed, language);

					currentFunction = {
						name,
						signature,
						parameters,
						returnType,
						startLine: i + 1,
						endLine: i + 1
					};
					inFunction = true;
				}
			}

			// Track function boundaries
			if (inFunction && currentFunction) {
				if (language === 'javascript' || language === 'typescript') {
					braceCount += (line.match(/\{/g) || []).length;
					braceCount -= (line.match(/\}/g) || []).length;

					if (braceCount === 0 && currentFunction.startLine !== i + 1) {
						currentFunction.endLine = i + 1;
						functions.push(currentFunction);
						inFunction = false;
						currentFunction = null;
					}
				} else if (language === 'python') {
					// Python functions end at the next function or class definition
					const nextDef = lines.slice(i + 1).findIndex(l => 
						l.trim().match(/^(def|class)\s+/)
					);
					if (nextDef !== -1) {
						currentFunction.endLine = i + 1;
						functions.push(currentFunction);
						inFunction = false;
						currentFunction = null;
					}
				}
			}
		}

		// Add final function if still in progress
		if (inFunction && currentFunction) {
			currentFunction.endLine = lines.length;
			functions.push(currentFunction);
		}

		return functions;
	}

	/**
	 * Extract class definitions from code
	 */
	private extractClasses(text: string, language: string): Array<{
		name: string;
		inheritance: string[];
		interfaces: string[];
		methods: string[];
		properties: string[];
		startLine: number;
		endLine: number;
	}> {
		const classes: Array<{
			name: string;
			inheritance: string[];
			interfaces: string[];
			methods: string[];
			properties: string[];
			startLine: number;
			endLine: number;
		}> = [];

		const lines = text.split('\n');
		let inClass = false;
		let currentClass: any = null;
		let braceCount = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Class declaration patterns
			if (language === 'javascript' || language === 'typescript') {
				const classMatch = trimmed.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?/);
				if (classMatch) {
					const name = classMatch[3];
					const inheritance = classMatch[4] ? [classMatch[4]] : [];
					const interfaces = classMatch[5] ? classMatch[5].split(',').map(i => i.trim()) : [];

					currentClass = {
						name,
						inheritance,
						interfaces,
						methods: [],
						properties: [],
						startLine: i + 1,
						endLine: i + 1
					};
					inClass = true;
					braceCount = 0;
				}
			} else if (language === 'python') {
				const classMatch = trimmed.match(/^class\s+(\w+)(?:\s*\(([^)]+)\))?/);
				if (classMatch) {
					const name = classMatch[1];
					const inheritance = classMatch[2] ? classMatch[2].split(',').map(i => i.trim()) : [];

					currentClass = {
						name,
						inheritance,
						interfaces: [],
						methods: [],
						properties: [],
						startLine: i + 1,
						endLine: i + 1
					};
					inClass = true;
				}
			}

			// Track class boundaries and extract methods/properties
			if (inClass && currentClass) {
				if (language === 'javascript' || language === 'typescript') {
					braceCount += (line.match(/\{/g) || []).length;
					braceCount -= (line.match(/\}/g) || []).length;

					// Extract methods and properties
					const methodMatch = trimmed.match(/^(\w+)\s*\([^)]*\)\s*[:{]/);
					const propertyMatch = trimmed.match(/^(\w+)\s*[:=]/);

					if (methodMatch) {
						currentClass.methods.push(methodMatch[1]);
					} else if (propertyMatch) {
						currentClass.properties.push(propertyMatch[1]);
					}

					if (braceCount === 0 && currentClass.startLine !== i + 1) {
						currentClass.endLine = i + 1;
						classes.push(currentClass);
						inClass = false;
						currentClass = null;
					}
				} else if (language === 'python') {
					// Extract methods and properties
					const methodMatch = trimmed.match(/^\s+def\s+(\w+)/);
					const propertyMatch = trimmed.match(/^\s+(\w+)\s*=/);

					if (methodMatch) {
						currentClass.methods.push(methodMatch[1]);
					} else if (propertyMatch) {
						currentClass.properties.push(propertyMatch[1]);
					}

					// Python classes end at the next class definition
					const nextClass = lines.slice(i + 1).findIndex(l => 
						l.trim().match(/^class\s+/)
					);
					if (nextClass !== -1) {
						currentClass.endLine = i + 1;
						classes.push(currentClass);
						inClass = false;
						currentClass = null;
					}
				}
			}
		}

		// Add final class if still in progress
		if (inClass && currentClass) {
			currentClass.endLine = lines.length;
			classes.push(currentClass);
		}

		return classes;
	}

	/**
	 * Extract variable declarations from code
	 */
	private extractVariables(text: string, language: string): Array<{
		name: string;
		type: string;
		value: string;
		scope: string;
		line: number;
	}> {
		const variables: Array<{
			name: string;
			type: string;
			value: string;
			scope: string;
			line: number;
		}> = [];

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			if (language === 'javascript' || language === 'typescript') {
				const varMatch = trimmed.match(/^(const|let|var)\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*(.+)/);
				if (varMatch) {
					const scope = varMatch[1];
					const name = varMatch[2];
					const type = varMatch[3] || 'any';
					const value = varMatch[4].replace(/;?\s*$/, '');

					variables.push({
						name,
						type,
						value,
						scope,
						line: i + 1
					});
				}
			} else if (language === 'python') {
				const varMatch = trimmed.match(/^(\w+)\s*=\s*(.+)/);
				if (varMatch) {
					const name = varMatch[1];
					const value = varMatch[2];
					const type = this.inferPythonType(value);

					variables.push({
						name,
						type,
						value,
						scope: 'local',
						line: i + 1
					});
				}
			}
		}

		return variables;
	}

	/**
	 * Extract import statements from code
	 */
	private extractImports(text: string, language: string): Array<{
		module: string;
		items: string[];
		alias: string;
		line: number;
	}> {
		const imports: Array<{
			module: string;
			items: string[];
			alias: string;
			line: number;
		}> = [];

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			if (language === 'javascript' || language === 'typescript') {
				const importMatch = trimmed.match(/^import\s+(?:\{([^}]+)\}\s+from\s+)?['"`]([^'"`]+)['"`](?:\s+as\s+(\w+))?/);
				if (importMatch) {
					const items = importMatch[1] ? importMatch[1].split(',').map(item => item.trim()) : [];
					const module = importMatch[2];
					const alias = importMatch[3] || '';

					imports.push({
						module,
						items,
						alias,
						line: i + 1
					});
				}
			} else if (language === 'python') {
				const importMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
				if (importMatch) {
					const module = importMatch[1];
					const items = importMatch[2].split(',').map(item => item.trim());
					const alias = '';

					imports.push({
						module,
						items,
						alias,
						line: i + 1
					});
				}
			}
		}

		return imports;
	}

	/**
	 * Extract headers from Markdown
	 */
	private extractHeaders(text: string): Array<{
		text: string;
		level: number;
		line: number;
	}> {
		const headers: Array<{
			text: string;
			level: number;
			line: number;
		}> = [];

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
			if (headerMatch) {
				const level = headerMatch[1].length;
				const text = headerMatch[2].trim();

				headers.push({
					text,
					level,
					line: i + 1
				});
			}
		}

		return headers;
	}

	/**
	 * Extract links from Markdown
	 */
	private extractLinks(text: string): Array<{
		text: string;
		url: string;
		line: number;
	}> {
		const links: Array<{
			text: string;
			url: string;
			line: number;
		}> = [];

		const lines = text.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);

			for (const match of linkMatches) {
				links.push({
					text: match[1],
					url: match[2],
					line: i + 1
				});
			}
		}

		return links;
	}

	/**
	 * Extract code blocks from Markdown
	 */
	private extractCodeBlocks(text: string): Array<{
		language: string;
		content: string;
		startLine: number;
		endLine: number;
	}> {
		const codeBlocks: Array<{
			language: string;
			content: string;
			startLine: number;
			endLine: number;
		}> = [];

		const lines = text.split('\n');
		let inCodeBlock = false;
		let currentBlock: any = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
				if (!inCodeBlock) {
					// Start of code block
					const language = trimmed.slice(3).trim();
					currentBlock = {
						language,
						content: '',
						startLine: i + 1,
						endLine: i + 1
					};
					inCodeBlock = true;
				} else {
					// End of code block
					currentBlock.endLine = i + 1;
					codeBlocks.push(currentBlock);
					inCodeBlock = false;
					currentBlock = null;
				}
			} else if (inCodeBlock && currentBlock) {
				currentBlock.content += line + '\n';
			}
		}

		return codeBlocks;
	}

	/**
	 * Extract lists from Markdown
	 */
	private extractLists(text: string): Array<{
		type: string;
		items: string[];
		startLine: number;
		endLine: number;
	}> {
		const lists: Array<{
			type: string;
			items: string[];
			startLine: number;
			endLine: number;
		}> = [];

		const lines = text.split('\n');
		let inList = false;
		let currentList: any = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
				if (!inList) {
					// Start of list
					const type = trimmed.match(/^\d+\.\s+/) ? 'ordered' : 'unordered';
					currentList = {
						type,
						items: [trimmed],
						startLine: i + 1,
						endLine: i + 1
					};
					inList = true;
				} else {
					// Continue list
					currentList.items.push(trimmed);
					currentList.endLine = i + 1;
				}
			} else if (inList && currentList && trimmed === '') {
				// End of list
				lists.push(currentList);
				inList = false;
				currentList = null;
			}
		}

		// Add final list if still in progress
		if (inList && currentList) {
			lists.push(currentList);
		}

		return lists;
	}

	/**
	 * Extract named entities from text
	 */
	private extractNamedEntities(text: string): Array<{
		text: string;
		type: string;
		confidence: number;
		position: number;
	}> {
		const entities: Array<{
			text: string;
			type: string;
			confidence: number;
			position: number;
		}> = [];

		// Simple pattern-based entity extraction
		// In a real implementation, this would use NLP libraries

		// Extract potential names (capitalized words)
		const nameMatches = text.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
		for (const match of nameMatches) {
			const text = match[0];
			const position = match.index || 0;
			
			// Simple heuristics for entity type
			let type = 'unknown';
			let confidence = 0.5;

			if (text.match(/^(Mr|Mrs|Ms|Dr|Prof|Sir|Madam)\b/)) {
				type = 'person';
				confidence = 0.8;
			} else if (text.match(/^(Inc|Corp|LLC|Ltd|Company|Corporation)\b/)) {
				type = 'organization';
				confidence = 0.7;
			} else if (text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\b/)) {
				type = 'date';
				confidence = 0.9;
			}

			entities.push({ text, type, confidence, position });
		}

		return entities;
	}

	/**
	 * Extract key concepts from text
	 */
	private extractKeyConcepts(text: string): Array<{
		text: string;
		importance: number;
		frequency: number;
		confidence: number;
		context: string;
	}> {
		const concepts: Array<{
			text: string;
			importance: number;
			frequency: number;
			confidence: number;
			context: string;
		}> = [];

		// Simple frequency-based concept extraction
		const words = text.toLowerCase().match(/\b\w+\b/g) || [];
		const wordFreq: Record<string, number> = {};

		// Count word frequencies
		words.forEach(word => {
			if (word.length > 3) { // Filter out short words
				wordFreq[word] = (wordFreq[word] || 0) + 1;
			}
		});

		// Find most frequent words as potential concepts
		const sortedWords = Object.entries(wordFreq)
			.sort(([,a], [,b]) => b - a)
			.slice(0, 10);

		sortedWords.forEach(([word, freq]) => {
			const importance = freq / words.length;
			const confidence = Math.min(0.9, importance * 2);

			concepts.push({
				text: word,
				importance,
				frequency: freq,
				confidence,
				context: this.extractContext(text, word)
			});
		});

		return concepts;
	}

	/**
	 * Extract relationships between entities
	 */
	private extractRelationships(text: string): Array<{
		entity1: string;
		entity2: string;
		relation: string;
		confidence: number;
	}> {
		const relationships: Array<{
			entity1: string;
			entity2: string;
			relation: string;
			confidence: number;
		}> = [];

		// Simple pattern-based relationship extraction
		const relationPatterns = [
			/(\w+)\s+(is|are|was|were)\s+(\w+)/gi,
			/(\w+)\s+(has|have|had)\s+(\w+)/gi,
			/(\w+)\s+(works|work|worked)\s+(at|for|with)\s+(\w+)/gi,
			/(\w+)\s+(lives|lived)\s+(in|at)\s+(\w+)/gi
		];

		relationPatterns.forEach(pattern => {
			const matches = text.matchAll(pattern);
			for (const match of matches) {
				const entity1 = match[1];
				const relation = match[2];
				const entity2 = match[3] || match[4];

				if (entity1 && entity2) {
					relationships.push({
						entity1,
						entity2,
						relation,
						confidence: 0.6
					});
				}
			}
		});

		return relationships;
	}

	/**
	 * Helper methods
	 */
	private extractParameters(signature: string): string[] {
		const paramMatch = signature.match(/\(([^)]*)\)/);
		if (!paramMatch) return [];

		return paramMatch[1]
			.split(',')
			.map(param => param.trim())
			.filter(param => param.length > 0);
	}

	private extractReturnType(signature: string, language: string): string {
		if (language === 'typescript') {
			const returnMatch = signature.match(/\)\s*:\s*([^=]+)/);
			return returnMatch ? returnMatch[1].trim() : 'any';
		}
		return 'unknown';
	}

	private inferPythonType(value: string): string {
		if (value.match(/^\d+$/)) return 'int';
		if (value.match(/^\d+\.\d+$/)) return 'float';
		if (value.match(/^['"`].*['"`]$/)) return 'str';
		if (value.match(/^\[.*\]$/)) return 'list';
		if (value.match(/^\{.*\}$/)) return 'dict';
		if (value.match(/^(True|False)$/)) return 'bool';
		return 'unknown';
	}

	private extractContext(text: string, word: string): string {
		const index = text.toLowerCase().indexOf(word);
		if (index === -1) return '';

		const start = Math.max(0, index - 50);
		const end = Math.min(text.length, index + word.length + 50);
		return text.substring(start, end);
	}

	/**
	 * Calculate overall extraction confidence
	 */
	private calculateConfidence(atoms: Atom[], chunk: Chunk): number {
		if (atoms.length === 0) return 0;

		const totalConfidence = atoms.reduce((sum, atom) => sum + atom.confidence, 0);
		const avgConfidence = totalConfidence / atoms.length;

		// Boost confidence for chunks with more atoms
		const atomBonus = Math.min(0.1, atoms.length * 0.01);

		return Math.min(1.0, avgConfidence + atomBonus);
	}
}
