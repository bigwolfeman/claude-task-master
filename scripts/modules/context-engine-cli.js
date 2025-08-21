#!/usr/bin/env node

/**
 * context-engine-cli.js
 * CLI implementation for context engine operations
 * Provides ingest, build-graph, query, and proof functionality
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';
import chalk from 'chalk';

// Import context engine components
import { DocumentChunker } from '../../src/context-engine/ingest/chunker.js';
import { SQLiteStorageBackend } from '../../src/context-engine/ingest/store.js';
import { ContextEngineInitializer } from '../../src/context-engine/init.js';

/**
 * CLI implementation for context engine ingest command
 */
export async function runIngestCLI(path, options = {}) {
	const {
		file: configFile = '.taskmaster/context-engine/config.json',
		chunkSize = 1000,
		chunkOverlap = 200
	} = options;

	try {
		console.log(chalk.blue('🚀 Starting Context Engine Document Ingestion'));
		console.log(chalk.blue(`📁 Source: ${path}`));
		console.log(chalk.blue(`⚙️  Config: ${configFile}`));
		console.log(chalk.blue(`📏 Chunk Size: ${chunkSize}`));
		console.log(chalk.blue(`🔄 Chunk Overlap: ${chunkOverlap}`));
		console.log('');

		// Initialize context engine
		console.log(chalk.yellow('🔧 Initializing context engine...'));
		const initializer = new ContextEngineInitializer();
		await initializer.initialize();
		
		if (!initializer.instance) {
			throw new Error('Failed to initialize context engine');
		}

		const storage = initializer.instance.storage;
		console.log(chalk.green('✅ Context engine initialized successfully'));
		console.log('');

		// Process the input path
		const stats = await stat(path);
		let documents = [];

		if (stats.isFile()) {
			// Single file
			documents = [await processFile(path, storage, chunkSize, chunkOverlap)];
		} else if (stats.isDirectory()) {
			// Directory - process all supported files
			documents = await processDirectory(path, storage, chunkSize, chunkOverlap);
		} else {
			throw new Error(`Path ${path} is neither a file nor a directory`);
		}

		// Summary
		console.log('');
		console.log(chalk.green('🎉 Ingestion completed successfully!'));
		console.log(chalk.blue(`📊 Total documents processed: ${documents.length}`));
		
		const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunks?.length || 0), 0);
		console.log(chalk.blue(`📝 Total chunks created: ${totalChunks}`));

		// Cleanup
		await initializer.shutdown();

	} catch (error) {
		console.error(chalk.red(`❌ Error during ingestion: ${error.message}`));
		if (process.env.DEBUG === '1') {
			console.error(chalk.red('Debug stack trace:'), error.stack);
		}
		throw error;
	}
}

/**
 * Process a single file
 */
async function processFile(filePath, storage, chunkSize, chunkOverlap) {
	const fileName = basename(filePath);
	const fileExt = extname(filePath).toLowerCase();
	
	console.log(chalk.blue(`📄 Processing file: ${fileName}`));

	// Check if file type is supported
	if (!isSupportedFileType(fileExt)) {
		console.log(chalk.yellow(`⚠️  Skipping unsupported file type: ${fileExt}`));
		return null;
	}

	try {
		// Read file content
		const content = await readFile(filePath, 'utf-8');
		
		// Create document record
		const document = {
			id: randomUUID(),
			title: fileName,
			content: content,
			metadata: {
				source: filePath,
				fileType: fileExt,
				size: content.length,
				ingestedAt: new Date().toISOString()
			},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		// Store document
		await storage.createDocument(document);
		console.log(chalk.green(`  ✅ Document stored: ${document.id}`));

		// Chunk the document
		const chunker = new DocumentChunker({
			maxTokens: parseInt(chunkSize),
			overlap: parseInt(chunkOverlap),
			respectMarkdown: fileExt === '.md',
			respectCode: fileExt === '.js' || fileExt === '.ts' || fileExt === '.py',
			preserveHeaders: true,
			preserveLists: true,
			preserveCodeBlocks: true
		});

		const chunks = await chunker.chunkDocument(document.id, content);
		
		// Store chunks
		for (const chunk of chunks) {
			await storage.createChunk(chunk);
		}

		console.log(chalk.green(`  ✅ Created ${chunks.length} chunks`));

		return {
			...document,
			chunks
		};

	} catch (error) {
		console.error(chalk.red(`  ❌ Error processing ${fileName}: ${error.message}`));
		throw error;
	}
}

/**
 * Process a directory of files
 */
async function processDirectory(dirPath, storage, chunkSize, chunkOverlap) {
	console.log(chalk.blue(`📁 Processing directory: ${dirPath}`));
	
	const files = await readdir(dirPath);
	const documents = [];
	
	for (const file of files) {
		const filePath = join(dirPath, file);
		const stats = await stat(filePath);
		
		if (stats.isFile()) {
			try {
				const doc = await processFile(filePath, storage, chunkSize, chunkOverlap);
				if (doc) {
					documents.push(doc);
				}
			} catch (error) {
				console.error(chalk.red(`  ❌ Failed to process ${file}: ${error.message}`));
				// Continue with other files
			}
		}
	}
	
	return documents;
}

/**
 * Check if file type is supported for ingestion
 */
function isSupportedFileType(ext) {
	const supportedTypes = [
		'.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c',
		'.html', '.css', '.json', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bat'
	];
	
	return supportedTypes.includes(ext);
}

/**
 * CLI implementation for context engine build-graph command
 */
export async function runBuildGraphCLI(options = {}) {
	const { file: configFile = '.taskmaster/context-engine/config.json', force = false } = options;

	try {
		console.log(chalk.blue('🏗️  Starting Knowledge Graph Construction'));
		console.log(chalk.blue(`⚙️  Config: ${configFile}`));
		if (force) {
			console.log(chalk.blue('🔄 Force rebuild enabled'));
		}
		console.log('');

		// TODO: Implement graph building functionality
		console.log(chalk.yellow('⚠️  Graph building functionality not yet implemented'));
		console.log(chalk.cyan('This feature will be available in future updates'));

	} catch (error) {
		console.error(chalk.red(`❌ Error building graph: ${error.message}`));
		throw error;
	}
}

/**
 * CLI implementation for context engine query command
 */
export async function runQueryCLI(query, options = {}) {
	const {
		file: configFile = '.taskmaster/context-engine/config.json',
		limit = 10,
		threshold = 0.7
	} = options;

	try {
		console.log(chalk.blue('🔍 Starting Context Engine Query'));
		console.log(chalk.blue(`❓ Query: ${query}`));
		console.log(chalk.blue(`⚙️  Config: ${configFile}`));
		console.log(chalk.blue(`📊 Result limit: ${limit}`));
		console.log(chalk.blue(`🎯 Relevance threshold: ${threshold}`));
		console.log('');

		// TODO: Implement query functionality
		console.log(chalk.yellow('⚠️  Query functionality not yet implemented'));
		console.log(chalk.cyan('This feature will be available in future updates'));

	} catch (error) {
		console.error(chalk.red(`❌ Error querying context engine: ${error.message}`));
		throw error;
	}
}

/**
 * CLI implementation for context engine proof command
 */
export async function runProofCLI(query, options = {}) {
	const {
		file: configFile = '.taskmaster/context-engine/config.json',
		maxEvidence = 5,
		minConfidence = 0.8
	} = options;

	try {
		console.log(chalk.blue('🔬 Starting Proof Generation'));
		console.log(chalk.blue(`❓ Query: ${query}`));
		console.log(chalk.blue(`⚙️  Config: ${configFile}`));
		console.log(chalk.blue(`📚 Max evidence pieces: ${maxEvidence}`));
		console.log(chalk.blue(`🎯 Min confidence: ${minConfidence}`));
		console.log('');

		// TODO: Implement proof generation functionality
		console.log(chalk.yellow('⚠️  Proof generation functionality not yet implemented'));
		console.log(chalk.cyan('This feature will be available in future updates'));

	} catch (error) {
		console.error(chalk.red(`❌ Error generating proof: ${error.message}`));
		throw error;
	}
}
