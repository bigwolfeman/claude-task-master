#!/usr/bin/env node

/**
 * verify-chunking.js
 * Simple verification script for chunking and atom extraction
 */

import { DocumentChunker } from '../src/context-engine/ingest/chunker.js';
import { AtomExtractor } from '../src/context-engine/ingest/atoms.js';

async function verifyChunking() {
	console.log('🔍 Verifying Text Chunking and Atom Extraction...\n');

	try {
		// Test 1: Document Chunker
		console.log('📝 Testing Document Chunker...');
		const chunker = new DocumentChunker({
			maxTokens: 100,
			overlap: 20,
			respectMarkdown: true,
			respectCode: true,
			preserveHeaders: true,
			preserveLists: true,
			preserveCodeBlocks: true
		});

		// Test Markdown chunking
		const markdownText = `# Introduction
This is a test document with multiple sections.

## Section 1
Content for section 1 with some text.

## Section 2
More content here with additional information.

- List item 1
- List item 2
- List item 3`;

		console.log('  📖 Chunking Markdown...');
		const markdownChunks = await chunker.chunkMarkdown('test-doc', markdownText);
		console.log(`    ✅ Created ${markdownChunks.length} chunks`);
		markdownChunks.forEach((chunk, index) => {
			console.log(`      Chunk ${index + 1}: ${chunk.text.substring(0, 50)}... (${chunk.tokens} tokens)`);
		});

		// Test Code chunking
		const codeText = `function testFunction(param1, param2) {
  const result = param1 + param2;
  return result;
}

class TestClass {
  constructor() {
    this.value = "test";
  }
  
  getValue() {
    return this.value;
  }
}`;

		console.log('\n  💻 Chunking JavaScript Code...');
		const codeChunks = await chunker.chunkCode('test-doc', codeText, 'javascript');
		console.log(`    ✅ Created ${codeChunks.length} chunks`);
		codeChunks.forEach((chunk, index) => {
			console.log(`      Chunk ${index + 1}: ${chunk.text.substring(0, 50)}... (${chunk.tokens} tokens)`);
		});

		// Test 2: Atom Extractor
		console.log('\n🔬 Testing Atom Extractor...');
		const extractor = new AtomExtractor({
			extractEntities: true,
			extractConcepts: true,
			extractRelationships: true,
			extractCodeElements: true,
			extractMarkdownElements: true,
			minConfidence: 0.7,
			maxAtomsPerChunk: 20
		});

		// Test atom extraction from code chunk
		console.log('  🔍 Extracting atoms from code chunk...');
		const codeChunk = codeChunks[0];
		const codeAtoms = await extractor.extractAtoms(codeChunk);
		console.log(`    ✅ Extracted ${codeAtoms.atoms.length} atoms`);
		console.log(`    📊 Confidence: ${(codeAtoms.confidence * 100).toFixed(1)}%`);
		console.log(`    ⏱️  Extraction time: ${codeAtoms.extractionTime}ms`);
		
		codeAtoms.atoms.forEach((atom, index) => {
			console.log(`      Atom ${index + 1}: ${atom.type} - "${atom.content}" (${(atom.confidence * 100).toFixed(1)}%)`);
		});

		// Test atom extraction from markdown chunk
		console.log('\n  🔍 Extracting atoms from markdown chunk...');
		const markdownChunk = markdownChunks[0];
		const markdownAtoms = await extractor.extractAtoms(markdownChunk);
		console.log(`    ✅ Extracted ${markdownAtoms.atoms.length} atoms`);
		console.log(`    📊 Confidence: ${(markdownAtoms.confidence * 100).toFixed(1)}%`);
		console.log(`    ⏱️  Extraction time: ${markdownAtoms.extractionTime}ms`);
		
		markdownAtoms.atoms.forEach((atom, index) => {
			console.log(`      Atom ${index + 1}: ${atom.type} - "${atom.content}" (${(atom.confidence * 100).toFixed(1)}%)`);
		});

		// Test 3: Integration
		console.log('\n🔄 Testing Integration...');
		const mixedText = `# API Documentation

Here is the main API function:

\`\`\`javascript
function apiCall(endpoint, data) {
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
\`\`\`

This function makes HTTP requests to the specified endpoint.`;

		console.log('  🔄 Processing mixed content...');
		const mixedChunks = await chunker.chunkDocument('test-doc', mixedText);
		console.log(`    ✅ Created ${mixedChunks.length} chunks from mixed content`);
		
		for (let i = 0; i < mixedChunks.length; i++) {
			const chunk = mixedChunks[i];
			console.log(`\n    Chunk ${i + 1} (${chunk.metadata?.chunkType || 'unknown'}):`);
			console.log(`      Text: ${chunk.text.substring(0, 80)}...`);
			console.log(`      Tokens: ${chunk.tokens}`);
			
			const atoms = await extractor.extractAtoms(chunk);
			console.log(`      Atoms: ${atoms.atoms.length} extracted`);
		}

		console.log('\n✅ All tests completed successfully!');
		console.log('\n📋 Summary:');
		console.log(`  - Markdown chunks: ${markdownChunks.length}`);
		console.log(`  - Code chunks: ${codeChunks.length}`);
		console.log(`  - Mixed chunks: ${mixedChunks.length}`);
		console.log(`  - Total atoms extracted: ${codeAtoms.atoms.length + markdownAtoms.atoms.length}`);

	} catch (error) {
		console.error('❌ Error during verification:', error);
		process.exit(1);
	}
}

// Run verification
verifyChunking().catch(console.error);
