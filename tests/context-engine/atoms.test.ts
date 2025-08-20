/**
 * atoms.test.ts
 * Unit tests for AtomExtractor
 */

import { AtomExtractor, type AtomExtractionOptions, type ExtractionResult } from '../../src/context-engine/ingest/atoms.js';
import type { Chunk, Atom } from '../../src/context-engine/types.js';

describe('AtomExtractor', () => {
	let extractor: AtomExtractor;
	let defaultOptions: AtomExtractionOptions;

	beforeEach(() => {
		defaultOptions = {
			extractEntities: true,
			extractConcepts: true,
			extractRelationships: true,
			extractCodeElements: true,
			extractMarkdownElements: true,
			minConfidence: 0.7,
			maxAtomsPerChunk: 50
		};
		extractor = new AtomExtractor(defaultOptions);
	});

	describe('Constructor', () => {
		it('should create extractor with default options', () => {
			expect(extractor).toBeInstanceOf(AtomExtractor);
		});

		it('should create extractor with custom options', () => {
			const customOptions: AtomExtractionOptions = {
				extractEntities: false,
				extractConcepts: false,
				extractRelationships: false,
				extractCodeElements: false,
				extractMarkdownElements: false,
				minConfidence: 0.9,
				maxAtomsPerChunk: 10
			};
			const customExtractor = new AtomExtractor(customOptions);
			expect(customExtractor).toBeInstanceOf(AtomExtractor);
		});
	});

	describe('Main Extraction Method', () => {
		it('should extract atoms from code chunks', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'function test() { return true; }',
				tokens: 10,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			expect(result.atoms.length).toBeGreaterThan(0);
			expect(result.confidence).toBeGreaterThan(0);
			expect(result.extractionTime).toBeGreaterThan(0);
			expect(result.metadata.codeElementsFound).toBeGreaterThan(0);
		});

		it('should extract atoms from Markdown chunks', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: '# Header\nContent with [link](url)',
				tokens: 10,
				metadata: { chunkType: 'markdown' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			expect(result.atoms.length).toBeGreaterThan(0);
			expect(result.metadata.markdownElementsFound).toBeGreaterThan(0);
		});

		it('should extract atoms from text chunks', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'John works at Microsoft. He is a developer.',
				tokens: 10,
				metadata: { chunkType: 'text' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			expect(result.atoms.length).toBeGreaterThan(0);
			expect(result.metadata.entitiesFound).toBeGreaterThan(0);
		});

		it('should respect maxAtomsPerChunk limit', async () => {
			const limitedExtractor = new AtomExtractor({ ...defaultOptions, maxAtomsPerChunk: 2 });
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'function test1() {}\nfunction test2() {}\nfunction test3() {}\nfunction test4() {}',
				tokens: 20,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await limitedExtractor.extractAtoms(chunk);
			expect(result.atoms.length).toBeLessThanOrEqual(2);
		});

		it('should filter by minimum confidence', async () => {
			const highConfidenceExtractor = new AtomExtractor({ ...defaultOptions, minConfidence: 0.9 });
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'function test() { return true; }',
				tokens: 10,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await highConfidenceExtractor.extractAtoms(chunk);
			result.atoms.forEach(atom => {
				expect(atom.confidence).toBeGreaterThanOrEqual(0.9);
			});
		});
	});

	describe('Code Atom Extraction', () => {
		it('should extract function definitions from JavaScript', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'function test(param1, param2) {\n  return param1 + param2;\n}',
				tokens: 15,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const functionAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'function'
			);
			
			expect(functionAtoms.length).toBeGreaterThan(0);
			const funcAtom = functionAtoms[0];
			expect(funcAtom.content).toBe('test');
			expect(funcAtom.metadata?.parameters).toEqual(['param1', 'param2']);
		});

		it('should extract class definitions from TypeScript', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'class TestClass extends BaseClass implements Interface {\n  private value: string;\n  constructor() {\n    this.value = "test";\n  }\n}',
				tokens: 25,
				metadata: { chunkType: 'code', language: 'typescript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const classAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'class'
			);
			
			expect(classAtoms.length).toBeGreaterThan(0);
			const classAtom = classAtoms[0];
			expect(classAtom.content).toBe('TestClass');
			expect(classAtom.metadata?.inheritance).toEqual(['BaseClass']);
			expect(classAtom.metadata?.interfaces).toEqual(['Interface']);
		});

		it('should extract variable declarations', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'const x: number = 42;\nlet y = "hello";\nvar z = true;',
				tokens: 15,
				metadata: { chunkType: 'code', language: 'typescript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const varAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'variable'
			);
			
			expect(varAtoms.length).toBe(3);
			expect(varAtoms.find(a => a.content === 'x')?.metadata?.type).toBe('number');
			expect(varAtoms.find(a => a.content === 'y')?.metadata?.scope).toBe('let');
		});

		it('should extract import statements', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'import { Component } from "react";\nimport * as utils from "./utils";\nimport defaultExport from "./default";',
				tokens: 15,
				metadata: { chunkType: 'code', language: 'typescript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const importAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'import'
			);
			
			expect(importAtoms.length).toBe(3);
			expect(importAtoms.find(a => a.content === 'react')?.metadata?.items).toEqual(['Component']);
		});

		it('should extract Python code elements', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'def test_function(param1, param2):\n    return param1 + param2\n\nclass TestClass:\n    def __init__(self):\n        self.value = "test"',
				tokens: 20,
				metadata: { chunkType: 'code', language: 'python' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const functionAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'function'
			);
			const classAtoms = result.atoms.filter(atom => 
				atom.type === 'code_element' && 
				atom.metadata?.elementType === 'class'
			);
			
			expect(functionAtoms.length).toBeGreaterThan(0);
			expect(classAtoms.length).toBeGreaterThan(0);
		});
	});

	describe('Markdown Atom Extraction', () => {
		it('should extract headers from Markdown', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: '# Main Title\n## Subtitle\n### Section',
				tokens: 10,
				metadata: { chunkType: 'markdown' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const headerAtoms = result.atoms.filter(atom => 
				atom.type === 'markdown_element' && 
				atom.metadata?.elementType === 'header'
			);
			
			expect(headerAtoms.length).toBe(3);
			expect(headerAtoms.find(a => a.content === 'Main Title')?.metadata?.level).toBe(1);
			expect(headerAtoms.find(a => a.content === 'Subtitle')?.metadata?.level).toBe(2);
		});

		it('should extract links from Markdown', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'Check out [this link](https://example.com) and [another one](https://test.com).',
				tokens: 15,
				metadata: { chunkType: 'markdown' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const linkAtoms = result.atoms.filter(atom => 
				atom.type === 'markdown_element' && 
				atom.metadata?.elementType === 'link'
			);
			
			expect(linkAtoms.length).toBe(2);
			expect(linkAtoms[0].metadata?.url).toBe('https://example.com');
			expect(linkAtoms[0].metadata?.text).toBe('this link');
		});

		it('should extract code blocks from Markdown', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'Here is some code:\n```javascript\nconst x = 1;\nconsole.log(x);\n```\nMore text.',
				tokens: 20,
				metadata: { chunkType: 'markdown' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const codeBlockAtoms = result.atoms.filter(atom => 
				atom.type === 'markdown_element' && 
				atom.metadata?.elementType === 'code_block'
			);
			
			expect(codeBlockAtoms.length).toBe(1);
			expect(codeBlockAtoms[0].metadata?.language).toBe('javascript');
			expect(codeBlockAtoms[0].metadata?.content).toContain('const x = 1;');
		});

		it('should extract lists from Markdown', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'Unordered list:\n- Item 1\n- Item 2\n\nOrdered list:\n1. First\n2. Second',
				tokens: 20,
				metadata: { chunkType: 'markdown' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const listAtoms = result.atoms.filter(atom => 
				atom.type === 'markdown_element' && 
				atom.metadata?.elementType === 'list'
			);
			
			expect(listAtoms.length).toBe(2);
			const unorderedList = listAtoms.find(a => a.metadata?.type === 'unordered');
			const orderedList = listAtoms.find(a => a.metadata?.type === 'ordered');
			
			expect(unorderedList?.metadata?.items).toContain('- Item 1');
			expect(orderedList?.metadata?.items).toContain('1. First');
		});
	});

	describe('Text Atom Extraction', () => {
		it('should extract named entities from text', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'John Smith works at Microsoft Corporation. He lives in Seattle, Washington.',
				tokens: 15,
				metadata: { chunkType: 'text' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const entityAtoms = result.atoms.filter(atom => atom.type === 'entity');
			
			expect(entityAtoms.length).toBeGreaterThan(0);
			const personEntity = entityAtoms.find(a => a.content === 'John Smith');
			const companyEntity = entityAtoms.find(a => a.content === 'Microsoft Corporation');
			
			expect(personEntity).toBeDefined();
			expect(companyEntity).toBeDefined();
		});

		it('should extract key concepts from text', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'The machine learning algorithm processes data efficiently. Machine learning is a subset of artificial intelligence.',
				tokens: 20,
				metadata: { chunkType: 'text' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const conceptAtoms = result.atoms.filter(atom => atom.type === 'concept');
			
			expect(conceptAtoms.length).toBeGreaterThan(0);
			const mlConcept = conceptAtoms.find(a => a.content === 'learning');
			expect(mlConcept).toBeDefined();
			expect(mlConcept?.metadata?.frequency).toBeGreaterThan(1);
		});

		it('should extract relationships between entities', async () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'John works at Microsoft. Alice lives in Seattle. Bob has a car.',
				tokens: 20,
				metadata: { chunkType: 'text' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await extractor.extractAtoms(chunk);
			const relationshipAtoms = result.atoms.filter(atom => atom.type === 'relationship');
			
			expect(relationshipAtoms.length).toBeGreaterThan(0);
			const workRelation = relationshipAtoms.find(a => a.metadata?.relation === 'works');
			expect(workRelation).toBeDefined();
			expect(workRelation?.metadata?.entity1).toBe('John');
			expect(workRelation?.metadata?.entity2).toBe('Microsoft');
		});
	});

	describe('Helper Methods', () => {
		it('should extract parameters from function signatures', () => {
			const signature = 'function test(param1, param2, param3)';
			const params = extractor['extractParameters'](signature);
			expect(params).toEqual(['param1', 'param2', 'param3']);
		});

		it('should extract return types from TypeScript signatures', () => {
			const signature = 'function test(): string';
			const returnType = extractor['extractReturnType'](signature, 'typescript');
			expect(returnType).toBe('string');
		});

		it('should infer Python types correctly', () => {
			expect(extractor['inferPythonType']('42')).toBe('int');
			expect(extractor['inferPythonType']('3.14')).toBe('float');
			expect(extractor['inferPythonType']('"hello"')).toBe('str');
			expect(extractor['inferPythonType']('[1, 2, 3]')).toBe('list');
			expect(extractor['inferPythonType']('{"key": "value"}')).toBe('dict');
			expect(extractor['inferPythonType']('True')).toBe('bool');
		});

		it('should extract context around words', () => {
			const text = 'This is a very long text that contains the word machine learning multiple times for testing purposes.';
			const context = extractor['extractContext'](text, 'machine');
			expect(context).toContain('machine');
			expect(context.length).toBeLessThanOrEqual(100);
		});
	});

	describe('Confidence Calculation', () => {
		it('should calculate confidence based on atom quality', () => {
			const atoms: Atom[] = [
				{
					id: '1',
					chunkId: 'chunk1',
					type: 'code_element',
					content: 'test',
					metadata: {},
					confidence: 0.9,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				{
					id: '2',
					chunkId: 'chunk1',
					type: 'entity',
					content: 'entity',
					metadata: {},
					confidence: 0.8,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
			];

			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'test content',
				tokens: 2,
				metadata: {},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const confidence = extractor['calculateConfidence'](atoms, chunk);
			expect(confidence).toBeGreaterThan(0.8);
			expect(confidence).toBeLessThanOrEqual(1.0);
		});

		it('should return 0 confidence for empty atoms', () => {
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'test content',
				tokens: 2,
				metadata: {},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const confidence = extractor['calculateConfidence']([], chunk);
			expect(confidence).toBe(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle extraction errors gracefully', async () => {
			// Mock a chunk that would cause errors
			const problematicChunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: 'function test() {',
				tokens: 5,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// Mock the private method to throw an error
			const originalMethod = extractor['extractCodeAtoms'];
			extractor['extractCodeAtoms'] = async () => {
				throw new Error('Test error');
			};

			const result = await extractor.extractAtoms(problematicChunk);
			expect(result.atoms.length).toBe(0);
			expect(result.confidence).toBe(0);
			expect(result.extractionTime).toBeGreaterThan(0);

			// Restore original method
			extractor['extractCodeAtoms'] = originalMethod;
		});
	});

	describe('Performance and Limits', () => {
		it('should handle large chunks efficiently', async () => {
			const largeText = 'This is a large text. '.repeat(1000);
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: largeText,
				tokens: largeText.split(' ').length,
				metadata: { chunkType: 'text' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const startTime = Date.now();
			const result = await extractor.extractAtoms(chunk);
			const endTime = Date.now();

			expect(result.extractionTime).toBeLessThan(1000); // Should complete within 1 second
			expect(result.atoms.length).toBeLessThanOrEqual(defaultOptions.maxAtomsPerChunk);
		});

		it('should respect maxAtomsPerChunk limit for large content', async () => {
			const limitedExtractor = new AtomExtractor({ ...defaultOptions, maxAtomsPerChunk: 5 });
			const largeCode = 'function test1() {}\n'.repeat(20);
			const chunk: Chunk = {
				id: 'chunk1',
				docId: 'doc1',
				text: largeCode,
				tokens: largeCode.split('\n').length,
				metadata: { chunkType: 'code', language: 'javascript' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			const result = await limitedExtractor.extractAtoms(chunk);
			expect(result.atoms.length).toBeLessThanOrEqual(5);
		});
	});
});
