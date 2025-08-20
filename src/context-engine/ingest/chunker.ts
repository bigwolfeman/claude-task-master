/**
 * chunker.ts
 * Text chunking with Markdown/code awareness
 * Implements intelligent chunking for various content types
 */

import type { Chunk } from '../types.js';

export interface ChunkerOptions {
	maxTokens: number;
	overlap: number;
	respectMarkdown: boolean;
	respectCode: boolean;
	preserveHeaders: boolean;
	preserveLists: boolean;
	preserveCodeBlocks: boolean;
}

export interface ChunkMetadata {
	chunkType: 'text' | 'markdown' | 'code' | 'header' | 'list' | 'table';
	level?: number; // For headers
	language?: string; // For code blocks
	startLine: number;
	endLine: number;
	section?: string; // Parent section/header
}

export class DocumentChunker {
	constructor(private options: ChunkerOptions = {
		maxTokens: 512,
		overlap: 50,
		respectMarkdown: true,
		respectCode: true,
		preserveHeaders: true,
		preserveLists: true,
		preserveCodeBlocks: true
	}) {}

	/**
	 * Main chunking method that automatically detects content type
	 */
	async chunkDocument(docId: string, text: string): Promise<Chunk[]> {
		if (this.options.respectMarkdown && this.isMarkdown(text)) {
			return this.chunkMarkdown(docId, text);
		} else if (this.options.respectCode && this.isCode(text)) {
			return this.chunkCode(docId, text, 'unknown');
		} else {
			return this.chunkPlainText(docId, text);
		}
	}

	/**
	 * Markdown-aware chunking that respects document structure
	 */
	async chunkMarkdown(docId: string, markdown: string): Promise<Chunk[]> {
		const lines = markdown.split('\n');
		const chunks: Chunk[] = [];
		let currentChunk = '';
		let currentMetadata: ChunkMetadata = {
			chunkType: 'markdown',
			startLine: 1,
			endLine: 1
		};
		let lineNumber = 1;

		for (const line of lines) {
			const lineType = this.classifyMarkdownLine(line);
			const lineTokens = this.countTokens(line);

			// Check if adding this line would exceed token limit
			if (currentChunk && this.countTokens(currentChunk + '\n' + line) > this.options.maxTokens) {
				// Finalize current chunk
				if (currentChunk.trim()) {
					chunks.push(this.createChunk(docId, currentChunk.trim(), currentMetadata));
				}

				// Start new chunk
				currentChunk = line;
				currentMetadata = {
					chunkType: lineType,
					startLine: lineNumber,
					endLine: lineNumber,
					level: lineType === 'header' ? this.getHeaderLevel(line) : undefined,
					section: lineType === 'header' ? this.extractHeaderText(line) : undefined
				};
			} else {
				// Add line to current chunk
				if (currentChunk) currentChunk += '\n';
				currentChunk += line;
				currentMetadata.endLine = lineNumber;
				currentMetadata.chunkType = this.determineChunkType(currentChunk);
			}

			lineNumber++;
		}

		// Add final chunk
		if (currentChunk.trim()) {
			chunks.push(this.createChunk(docId, currentChunk.trim(), currentMetadata));
		}

		// Apply overlap between chunks if specified
		return this.applyOverlap(chunks);
	}

	/**
	 * Code-aware chunking that respects function/class boundaries
	 */
	async chunkCode(docId: string, code: string, language: string): Promise<Chunk[]> {
		const chunks: Chunk[] = [];
		const lines = code.split('\n');
		let currentChunk = '';
		let currentMetadata: ChunkMetadata = {
			chunkType: 'code',
			language,
			startLine: 1,
			endLine: 1
		};
		let lineNumber = 1;

		for (const line of lines) {
			const lineTokens = this.countTokens(line);
			const isBoundary = this.isCodeBoundary(line, language);

			// Check if adding this line would exceed token limit
			if (currentChunk && this.countTokens(currentChunk + '\n' + line) > this.options.maxTokens) {
				// Finalize current chunk
				if (currentChunk.trim()) {
					chunks.push(this.createChunk(docId, currentChunk.trim(), currentMetadata));
				}

				// Start new chunk
				currentChunk = line;
				currentMetadata = {
					chunkType: 'code',
					language,
					startLine: lineNumber,
					endLine: lineNumber
				};
			} else {
				// Add line to current chunk
				if (currentChunk) currentChunk += '\n';
				currentChunk += line;
				currentMetadata.endLine = lineNumber;
			}

			lineNumber++;
		}

		// Add final chunk
		if (currentChunk.trim()) {
			chunks.push(this.createChunk(docId, currentChunk.trim(), currentMetadata));
		}

		return this.applyOverlap(chunks);
	}

	/**
	 * Plain text chunking for non-structured content
	 */
	private chunkPlainText(docId: string, text: string): Chunk[] {
		const chunks: Chunk[] = [];
		const sentences = this.splitIntoSentences(text);
		let currentChunk = '';
		let startIndex = 0;

		for (let i = 0; i < sentences.length; i++) {
			const sentence = sentences[i];
			const sentenceTokens = this.countTokens(sentence);

			if (this.countTokens(currentChunk + ' ' + sentence) > this.options.maxTokens) {
				// Finalize current chunk
				if (currentChunk.trim()) {
					const chunkText = text.substring(startIndex, startIndex + currentChunk.length);
					chunks.push(this.createChunk(docId, chunkText.trim(), {
						chunkType: 'text',
						startLine: 1,
						endLine: 1
					}));
				}

				// Start new chunk
				currentChunk = sentence;
				startIndex = text.indexOf(sentence, startIndex);
			} else {
				// Add sentence to current chunk
				if (currentChunk) currentChunk += ' ';
				currentChunk += sentence;
			}
		}

		// Add final chunk
		if (currentChunk.trim()) {
			const chunkText = text.substring(startIndex);
			chunks.push(this.createChunk(docId, chunkText.trim(), {
				chunkType: 'text',
				startLine: 1,
				endLine: 1
			}));
		}

		return this.applyOverlap(chunks);
	}

	/**
	 * Apply overlap between chunks to maintain context
	 */
	private applyOverlap(chunks: Chunk[]): Chunk[] {
		if (this.options.overlap === 0 || chunks.length <= 1) {
			return chunks;
		}

		const overlappedChunks: Chunk[] = [];
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			let overlappedText = chunk.text;

			// Add overlap from previous chunk
			if (i > 0) {
				const prevChunk = chunks[i - 1];
				const overlapText = this.extractOverlapText(prevChunk.text, this.options.overlap);
				if (overlapText) {
					overlappedText = overlapText + '\n' + overlappedText;
				}
			}

			// Add overlap to next chunk
			if (i < chunks.length - 1) {
				const nextChunk = chunks[i + 1];
				const overlapText = this.extractOverlapText(nextChunk.text, this.options.overlap);
				if (overlapText) {
					overlappedText = overlappedText + '\n' + overlapText;
				}
			}

			overlappedChunks.push({
				...chunk,
				text: overlappedText
			});
		}

		return overlappedChunks;
	}

	/**
	 * Extract overlap text from the end of a chunk
	 */
	private extractOverlapText(text: string, overlapTokens: number): string {
		const words = text.split(/\s+/);
		if (words.length <= overlapTokens) {
			return text;
		}

		const overlapWords = words.slice(-overlapTokens);
		return overlapWords.join(' ');
	}

	/**
	 * Create a Chunk object with metadata
	 */
	private createChunk(docId: string, text: string, metadata: ChunkMetadata): Chunk {
		return {
			id: `${docId}_chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			docId,
			text,
			tokens: this.countTokens(text),
			metadata: {
				chunkType: metadata.chunkType,
				level: metadata.level,
				language: metadata.language,
				startLine: metadata.startLine,
				endLine: metadata.endLine,
				section: metadata.section
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	/**
	 * Classify a Markdown line by its type
	 */
	private classifyMarkdownLine(line: string): ChunkMetadata['chunkType'] {
		const trimmed = line.trim();
		
		if (trimmed.startsWith('#')) return 'header';
		if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) return 'list';
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) return 'table';
		if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return 'code';
		if (trimmed.startsWith('> ')) return 'text'; // Blockquote
		if (trimmed === '') return 'text'; // Empty line
		
		return 'text';
	}

	/**
	 * Determine the overall chunk type based on content
	 */
	private determineChunkType(content: string): ChunkMetadata['chunkType'] {
		const lines = content.split('\n');
		const types = lines.map(line => this.classifyMarkdownLine(line));
		
		if (types.some(t => t === 'code')) return 'code';
		if (types.some(t => t === 'header')) return 'markdown';
		if (types.some(t => t === 'list')) return 'markdown';
		if (types.some(t => t === 'table')) return 'markdown';
		
		return 'text';
	}

	/**
	 * Get header level (1-6) from Markdown line
	 */
	private getHeaderLevel(line: string): number {
		const match = line.match(/^(#{1,6})\s/);
		return match ? match[1].length : 1;
	}

	/**
	 * Extract header text without the # symbols
	 */
	private extractHeaderText(line: string): string {
		return line.replace(/^#{1,6}\s+/, '').trim();
	}

	/**
	 * Check if a line represents a code boundary
	 */
	private isCodeBoundary(line: string, language: string): boolean {
		const trimmed = line.trim();
		
		// Function/class definitions
		if (language === 'javascript' || language === 'typescript') {
			return /^(function|class|const|let|var)\s+\w+/.test(trimmed) ||
				   /^export\s+(function|class|const|let|var)/.test(trimmed) ||
				   /^import\s+/.test(trimmed);
		}
		
		// Python
		if (language === 'python') {
			return /^(def|class|import|from)\s+\w+/.test(trimmed);
		}
		
		// Java/C#
		if (language === 'java' || language === 'csharp') {
			return /^(public|private|protected)?\s*(class|interface|enum|void|int|string)\s+\w+/.test(trimmed);
		}
		
		return false;
	}

	/**
	 * Split text into sentences for plain text chunking
	 */
	private splitIntoSentences(text: string): string[] {
		// Simple sentence splitting - can be enhanced with NLP libraries
		return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
	}

	/**
	 * Check if text appears to be Markdown
	 */
	private isMarkdown(text: string): boolean {
		const markdownPatterns = [
			/^#\s+/m,           // Headers
			/^\*\s+/m,           // Lists
			/^-\s+/m,            // Lists
			/^\+\s+/m,           // Lists
			/^\|.*\|$/m,         // Tables
			/^\>.*$/m,           // Blockquotes
			/\*\*.*\*\*/m,       // Bold
			/\*.*\*/m,           // Italic
			/\[.*\]\(.*\)/m,     // Links
			/```[\s\S]*```/m,    // Code blocks
			/~~[\s\S]*~~/m       // Strikethrough
		];
		
		return markdownPatterns.some(pattern => pattern.test(text));
	}

	/**
	 * Check if text appears to be code
	 */
	private isCode(text: string): boolean {
		const codePatterns = [
			/^(function|class|const|let|var)\s+\w+/m,  // JS/TS
			/^(def|class|import|from)\s+\w+/m,         // Python
			/^(public|private|protected)?\s*(class|interface|enum|void|int|string)\s+\w+/m, // Java/C#
			/^(fn|struct|enum|impl|trait)\s+\w+/m,     // Rust
			/^(func|type|struct|interface)\s+\w+/m,    // Go
			/^\s*[a-zA-Z_]\w*\s*[=:]\s*[^;]*;?$/m,   // Variable assignments
			/^\s*[a-zA-Z_]\w*\s*\([^)]*\)\s*\{?$/m,  // Function calls
			/^\s*if\s*\(.*\)\s*\{?$/m,                // If statements
			/^\s*for\s*\(.*\)\s*\{?$/m,               // For loops
			/^\s*while\s*\(.*\)\s*\{?$/m              // While loops
		];
		
		return codePatterns.some(pattern => pattern.test(text));
	}

	/**
	 * Improved token counting using word boundaries and special characters
	 */
	countTokens(text: string): number {
		if (!text || text.length === 0) return 0;
		
		// Split by word boundaries and filter out empty strings
		const words = text.split(/\s+/).filter(word => word.length > 0);
		
		// Count tokens (words + punctuation)
		let tokenCount = words.length;
		
		// Add tokens for punctuation and special characters
		const punctuation = text.match(/[^\w\s]/g);
		if (punctuation) {
			tokenCount += punctuation.length;
		}
		
		// Add tokens for numbers
		const numbers = text.match(/\d+/g);
		if (numbers) {
			tokenCount += numbers.length;
		}
		
		// Add tokens for code blocks and inline code
		const codeBlocks = text.match(/```[\s\S]*?```/g);
		if (codeBlocks) {
			codeBlocks.forEach(block => {
				tokenCount += Math.ceil(block.length / 4); // Approximate token count for code
			});
		}
		
		return Math.max(1, tokenCount); // Ensure at least 1 token
	}
}
