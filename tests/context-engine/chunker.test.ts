/**
 * chunker.test.ts
 * Unit tests for DocumentChunker
 */

import { DocumentChunker, type ChunkerOptions } from '../../src/context-engine/ingest/chunker.js';

describe('DocumentChunker', () => {
	let chunker: DocumentChunker;
	let defaultOptions: ChunkerOptions;

	beforeEach(() => {
		defaultOptions = {
			maxTokens: 512,
			overlap: 50,
			respectMarkdown: true,
			respectCode: true,
			preserveHeaders: true,
			preserveLists: true,
			preserveCodeBlocks: true
		};
		chunker = new DocumentChunker(defaultOptions);
	});

	describe('Constructor', () => {
		it('should create chunker with default options', () => {
			expect(chunker).toBeInstanceOf(DocumentChunker);
		});

		it('should create chunker with custom options', () => {
			const customOptions: ChunkerOptions = {
				maxTokens: 256,
				overlap: 25,
				respectMarkdown: false,
				respectCode: false,
				preserveHeaders: false,
				preserveLists: false,
				preserveCodeBlocks: false
			};
			const customChunker = new DocumentChunker(customOptions);
			expect(customChunker).toBeInstanceOf(DocumentChunker);
		});
	});

	describe('Token Counting', () => {
		it('should count tokens accurately for simple text', () => {
			const text = 'Hello world this is a test';
			expect(chunker.countTokens(text)).toBe(6);
		});

		it('should count tokens for text with punctuation', () => {
			const text = 'Hello, world! This is a test.';
			expect(chunker.countTokens(text)).toBe(8); // words + punctuation
		});

		it('should count tokens for code blocks', () => {
			const text = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
			expect(chunker.countTokens(text)).toBeGreaterThan(10);
		});

		it('should handle empty text', () => {
			expect(chunker.countTokens('')).toBe(0);
			expect(chunker.countTokens('   ')).toBe(0);
		});
	});

	describe('Markdown Detection', () => {
		it('should detect Markdown headers', () => {
			const text = '# Header 1\n## Header 2';
			expect(chunker['isMarkdown'](text)).toBe(true);
		});

		it('should detect Markdown lists', () => {
			const text = '- Item 1\n- Item 2\n* Item 3';
			expect(chunker['isMarkdown'](text)).toBe(true);
		});

		it('should detect Markdown links', () => {
			const text = '[Link text](https://example.com)';
			expect(chunker['isMarkdown'](text)).toBe(true);
		});

		it('should detect Markdown code blocks', () => {
			const text = '```\ncode here\n```';
			expect(chunker['isMarkdown'](text)).toBe(true);
		});

		it('should not detect plain text as Markdown', () => {
			const text = 'This is just plain text without any Markdown features.';
			expect(chunker['isMarkdown'](text)).toBe(false);
		});
	});

	describe('Code Detection', () => {
		it('should detect JavaScript/TypeScript code', () => {
			const text = 'function test() {\n  const x = 1;\n  return x;\n}';
			expect(chunker['isCode'](text)).toBe(true);
		});

		it('should detect Python code', () => {
			const text = 'def test():\n    x = 1\n    return x';
			expect(chunker['isCode'](text)).toBe(true);
		});

		it('should detect variable assignments', () => {
			const text = 'const x = 1;\nlet y = "test";';
			expect(chunker['isCode'](text)).toBe(true);
		});

		it('should not detect plain text as code', () => {
			const text = 'This is just plain text without any code patterns.';
			expect(chunker['isCode'](text)).toBe(false);
		});
	});

	describe('Markdown Chunking', () => {
		it('should chunk Markdown with headers', async () => {
			const markdown = `# Introduction
This is the introduction section.

## Section 1
Content for section 1.

## Section 2
Content for section 2.`;

			const chunks = await chunker.chunkMarkdown('doc1', markdown);
			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0].metadata?.chunkType).toBe('markdown');
		});

		it('should respect maxTokens limit', async () => {
			const longText = 'This is a very long text. '.repeat(100);
			const markdown = `# Header\n${longText}`;

			const chunks = await chunker.chunkMarkdown('doc1', markdown);
			chunks.forEach(chunk => {
				expect(chunk.tokens).toBeLessThanOrEqual(defaultOptions.maxTokens);
			});
		});

		it('should preserve header information', async () => {
			const markdown = `# Main Title
Content here.

## Subtitle
More content.`;

			const chunks = await chunker.chunkMarkdown('doc1', markdown);
			const headerChunk = chunks.find(chunk => 
				chunk.metadata?.chunkType === 'header' || 
				chunk.text.includes('# Main Title')
			);
			expect(headerChunk).toBeDefined();
		});
	});

	describe('Code Chunking', () => {
		it('should chunk JavaScript code', async () => {
			const code = `function test() {
  const x = 1;
  return x;
}

class TestClass {
  constructor() {
    this.value = 'test';
  }
}`;

			const chunks = await chunker.chunkCode('doc1', code, 'javascript');
			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0].metadata?.chunkType).toBe('code');
			expect(chunks[0].metadata?.language).toBe('javascript');
		});

		it('should chunk Python code', async () => {
			const code = `def test():
    x = 1
    return x

class TestClass:
    def __init__(self):
        self.value = 'test'`;

			const chunks = await chunker.chunkCode('doc1', code, 'python');
			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0].metadata?.chunkType).toBe('code');
			expect(chunks[0].metadata?.language).toBe('python');
		});

		it('should respect function boundaries', async () => {
			const code = `function func1() {
  return 1;
}

function func2() {
  return 2;
}`;

			const chunks = await chunker.chunkCode('doc1', code, 'javascript');
			// Should create separate chunks for each function
			expect(chunks.length).toBeGreaterThan(1);
		});
	});

	describe('Plain Text Chunking', () => {
		it('should chunk plain text by sentences', async () => {
			const text = 'This is sentence one. This is sentence two. This is sentence three.';
			const chunks = await chunker['chunkPlainText']('doc1', text);
			expect(chunks.length).toBeGreaterThan(0);
		});

		it('should respect token limits for plain text', async () => {
			const longText = 'This is a very long sentence. '.repeat(50);
			const chunks = await chunker['chunkPlainText']('doc1', longText);
			chunks.forEach(chunk => {
				expect(chunk.tokens).toBeLessThanOrEqual(defaultOptions.maxTokens);
			});
		});
	});

	describe('Overlap Application', () => {
		it('should apply overlap between chunks', async () => {
			const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
			const chunks = await chunker['chunkPlainText']('doc1', text);
			
			if (chunks.length > 1) {
				const overlappedChunks = chunker['applyOverlap'](chunks);
				expect(overlappedChunks.length).toBe(chunks.length);
				
				// Check that overlap text is added
				overlappedChunks.forEach((chunk, index) => {
					if (index > 0) {
						// Should have some overlap from previous chunk
						expect(chunk.text.length).toBeGreaterThanOrEqual(chunks[index].text.length);
					}
				});
			}
		});

		it('should not apply overlap when overlap is 0', () => {
			const noOverlapChunker = new DocumentChunker({ ...defaultOptions, overlap: 0 });
			const chunks = [
				{ id: '1', text: 'Chunk 1', tokens: 2, metadata: {}, createdAt: '', updatedAt: '' },
				{ id: '2', text: 'Chunk 2', tokens: 2, metadata: {}, createdAt: '', updatedAt: '' }
			];
			
			const overlappedChunks = noOverlapChunker['applyOverlap'](chunks);
			expect(overlappedChunks).toEqual(chunks);
		});
	});

	describe('Chunk Creation', () => {
		it('should create chunks with proper metadata', async () => {
			const metadata = {
				chunkType: 'markdown' as const,
				startLine: 1,
				endLine: 5,
				level: 1,
				section: 'Test Section'
			};

			const chunk = chunker['createChunk']('doc1', 'Test content', metadata);
			expect(chunk.docId).toBe('doc1');
			expect(chunk.metadata?.chunkType).toBe('markdown');
			expect(chunk.metadata?.level).toBe(1);
			expect(chunk.metadata?.section).toBe('Test Section');
			expect(chunk.createdAt).toBeDefined();
			expect(chunk.updatedAt).toBeDefined();
		});

		it('should generate unique chunk IDs', async () => {
			const metadata = { chunkType: 'text' as const, startLine: 1, endLine: 1 };
			const chunk1 = chunker['createChunk']('doc1', 'Content 1', metadata);
			const chunk2 = chunker['createChunk']('doc1', 'Content 2', metadata);
			
			expect(chunk1.id).not.toBe(chunk2.id);
		});
	});

	describe('Line Classification', () => {
		it('should classify Markdown headers correctly', () => {
			expect(chunker['classifyMarkdownLine']('# Header')).toBe('header');
			expect(chunker['classifyMarkdownLine']('## Subheader')).toBe('header');
			expect(chunker['classifyMarkdownLine']('###### Deep')).toBe('header');
		});

		it('should classify Markdown lists correctly', () => {
			expect(chunker['classifyMarkdownLine']('- Item')).toBe('list');
			expect(chunker['classifyMarkdownLine']('* Item')).toBe('list');
			expect(chunker['classifyMarkdownLine']('+ Item')).toBe('list');
		});

		it('should classify Markdown tables correctly', () => {
			expect(chunker['classifyMarkdownLine']('| Header | Header |')).toBe('table');
		});

		it('should classify code blocks correctly', () => {
			expect(chunker['classifyMarkdownLine']('```javascript')).toBe('code');
			expect(chunker['classifyMarkdownLine']('~~~python')).toBe('code');
		});

		it('should classify regular text correctly', () => {
			expect(chunker['classifyMarkdownLine']('Regular text')).toBe('text');
			expect(chunker['classifyMarkdownLine']('')).toBe('text');
		});
	});

	describe('Header Processing', () => {
		it('should extract header level correctly', () => {
			expect(chunker['getHeaderLevel']('# Header')).toBe(1);
			expect(chunker['getHeaderLevel']('## Header')).toBe(2);
			expect(chunker['getHeaderLevel']('###### Header')).toBe(6);
		});

		it('should extract header text without symbols', () => {
			expect(chunker['extractHeaderText']('# Main Title')).toBe('Main Title');
			expect(chunker['extractHeaderText']('## Subtitle')).toBe('Subtitle');
		});
	});

	describe('Code Boundary Detection', () => {
		it('should detect JavaScript function boundaries', () => {
			expect(chunker['isCodeBoundary']('function test() {', 'javascript')).toBe(true);
			expect(chunker['isCodeBoundary']('export function test() {', 'javascript')).toBe(true);
			expect(chunker['isCodeBoundary']('const test = () => {', 'javascript')).toBe(true);
		});

		it('should detect Python function boundaries', () => {
			expect(chunker['isCodeBoundary']('def test():', 'python')).toBe(true);
			expect(chunker['isCodeBoundary']('class Test:', 'python')).toBe(true);
		});

		it('should not detect regular lines as boundaries', () => {
			expect(chunker['isCodeBoundary']('const x = 1;', 'javascript')).toBe(false);
			expect(chunker['isCodeBoundary']('x = 1', 'python')).toBe(false);
		});
	});

	describe('Sentence Splitting', () => {
		it('should split text into sentences', () => {
			const text = 'Hello world. How are you? I am fine!';
			const sentences = chunker['splitIntoSentences'](text);
			expect(sentences.length).toBe(3);
			expect(sentences[0]).toBe('Hello world');
			expect(sentences[1]).toBe(' How are you');
			expect(sentences[2]).toBe(' I am fine');
		});

		it('should handle text without sentence endings', () => {
			const text = 'Hello world how are you';
			const sentences = chunker['splitIntoSentences'](text);
			expect(sentences.length).toBe(1);
			expect(sentences[0]).toBe('Hello world how are you');
		});
	});

	describe('Overlap Text Extraction', () => {
		it('should extract overlap text correctly', () => {
			const text = 'This is a test sentence with multiple words';
			const overlapText = chunker['extractOverlapText'](text, 3);
			expect(overlapText).toBe('sentence with multiple');
		});

		it('should handle text shorter than overlap', () => {
			const text = 'Short text';
			const overlapText = chunker['extractOverlapText'](text, 10);
			expect(overlapText).toBe(text);
		});
	});

	describe('Chunk Type Determination', () => {
		it('should determine chunk type based on content', () => {
			expect(chunker['determineChunkType']('# Header\nContent')).toBe('markdown');
			expect(chunker['determineChunkType']('```\ncode\n```')).toBe('code');
			expect(chunker['determineChunkType']('Plain text content')).toBe('text');
		});
	});

	describe('Integration Tests', () => {
		it('should automatically detect and chunk Markdown content', async () => {
			const markdown = `# Document Title
This is a Markdown document.

## Section 1
Content for section 1.

- List item 1
- List item 2

## Section 2
More content here.`;

			const chunks = await chunker.chunkDocument('doc1', markdown);
			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0].metadata?.chunkType).toBe('markdown');
		});

		it('should automatically detect and chunk code content', async () => {
			const code = `function test() {
  return "hello world";
}

class TestClass {
  constructor() {
    this.value = "test";
  }
}`;

			const chunks = await chunker.chunkDocument('doc1', code);
			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0].metadata?.chunkType).toBe('code');
		});

		it('should handle mixed content types', async () => {
			const mixedContent = `# Documentation

Here is some text.

\`\`\`javascript
function example() {
  return true;
}
\`\`\`

More text here.`;

			const chunks = await chunker.chunkDocument('doc1', mixedContent);
			expect(chunks.length).toBeGreaterThan(0);
		});
	});
});
