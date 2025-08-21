/**
 * ingest-document.js
 * Direct function implementation for document ingestion operations
 */

import path from 'path';
import fs from 'fs/promises';
import { initializeContextEngine } from '../../../../src/context-engine/init.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for document ingestion operations.
 * Allows adding documents to the context engine storage for later retrieval.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.filePath - Path to the document file to ingest (required)
 * @param {string} [args.projectRoot] - Project root path
 * @param {string} [args.documentId] - Custom document ID (optional, auto-generated if not provided)
 * @param {Object} [args.metadata] - Additional metadata for the document
 * @param {Object} log - Logger object
 * @param {Object} context - Additional context (session)
 * @returns {Promise<Object>} - Result object with ingestion status
 */
export async function ingestDocumentDirect(args, log, context = {}) {
	// Destructure expected args
	const {
		filePath,
		projectRoot,
		documentId,
		metadata = {}
	} = args;
	const { session } = context;

	try {
		// Check required parameters
		if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
			log.error('Missing or invalid required parameter: filePath');
			return {
				success: false,
				error: {
					code: 'MISSING_PARAMETER',
					message: 'The filePath parameter is required and must be a non-empty string'
				}
			};
		}

		// Resolve absolute file path
		const absoluteFilePath = projectRoot 
			? path.resolve(projectRoot, filePath)
			: path.resolve(filePath);

		// Check if file exists
		try {
			await fs.access(absoluteFilePath);
		} catch (error) {
			log.error(`File not found: ${absoluteFilePath}`);
			return {
				success: false,
				error: {
					code: 'FILE_NOT_FOUND',
					message: `File not found: ${filePath}`
				}
			};
		}

		log.info(`Ingesting document: ${absoluteFilePath}`);

		// Initialize context engine
		const contextEngine = await initializeContextEngine({
			projectRoot,
			enableLogging: false // Disable logging in MCP context
		});

		// Read file content
		const fileContent = await fs.readFile(absoluteFilePath, 'utf-8');
		const fileName = path.basename(absoluteFilePath);
		const fileExtension = path.extname(absoluteFilePath);

		// Generate document ID if not provided
		const finalDocumentId = documentId || `${fileName}-${Date.now()}`;

		// Create document metadata
		const documentMetadata = {
			...metadata,
			fileName,
			fileExtension,
			filePath: absoluteFilePath,
			fileSize: fileContent.length,
			ingestedAt: new Date().toISOString()
		};

		// Add document to storage
		const document = await contextEngine.storage.addDocument({
			id: finalDocumentId,
			title: fileName,
			content: fileContent,
			metadata: documentMetadata
		});

		// Shutdown context engine
		await contextEngine.shutdown();

		log.info(`Document ingested successfully: ${finalDocumentId}`);

		return {
			success: true,
			data: {
				documentId: finalDocumentId,
				fileName,
				fileSize: fileContent.length,
				metadata: documentMetadata,
				message: 'Document ingested successfully'
			}
		};

	} catch (error) {
		log.error(`Document ingestion failed: ${error.message}`, { stack: error.stack });
		return {
			success: false,
			error: {
				code: 'INGESTION_ERROR',
				message: `Document ingestion failed: ${error.message}`,
				details: error.stack
			}
		};
	}
}
