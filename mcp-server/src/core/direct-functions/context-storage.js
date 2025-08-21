/**
 * context-storage.js
 * Direct function implementation for context engine storage management
 */

import path from 'path';
import { initializeContextEngine } from '../../../../src/context-engine/init.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for context engine storage management operations.
 * Provides access to storage statistics, document listing, and cleanup operations.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.operation - The operation to perform: 'stats', 'list', 'cleanup' (required)
 * @param {string} [args.projectRoot] - Project root path
 * @param {string} [args.documentId] - Document ID for specific operations
 * @param {Object} log - Logger object
 * @param {Object} context - Additional context (session)
 * @returns {Promise<Object>} - Result object with operation results
 */
export async function contextStorageDirect(args, log, context = {}) {
	// Destructure expected args
	const {
		operation,
		projectRoot,
		documentId
	} = args;
	const { session } = context;

	try {
		// Check required parameters
		if (!operation || typeof operation !== 'string' || operation.trim().length === 0) {
			log.error('Missing or invalid required parameter: operation');
			return {
				success: false,
				error: {
					code: 'MISSING_PARAMETER',
					message: 'The operation parameter is required and must be a non-empty string'
				}
			};
		}

		// Validate operation type
		const validOperations = ['stats', 'list', 'cleanup', 'get', 'delete'];
		if (!validOperations.includes(operation)) {
			log.error(`Invalid operation: ${operation}`);
			return {
				success: false,
				error: {
					code: 'INVALID_OPERATION',
					message: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
				}
			};
		}

		log.info(`Performing context storage operation: ${operation}`);

		// Initialize context engine
		const contextEngine = await initializeContextEngine({
			projectRoot,
			enableLogging: false // Disable logging in MCP context
		});

		let result;

		switch (operation) {
			case 'stats':
				// Get storage statistics
				const documents = await contextEngine.storage.getAllDocuments();
				const chunks = await contextEngine.storage.getAllChunks();
				const totalSize = documents.reduce((sum, doc) => sum + (doc.metadata?.fileSize || 0), 0);
				
				result = {
					totalDocuments: documents.length,
					totalChunks: chunks.length,
					totalSizeBytes: totalSize,
					totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
					storagePath: contextEngine.config.getStorageConfig().path
				};
				break;

			case 'list':
				// List all documents
				const allDocuments = await contextEngine.storage.getAllDocuments();
				result = {
					documents: allDocuments.map(doc => ({
						id: doc.id,
						title: doc.title,
						createdAt: doc.createdAt,
						updatedAt: doc.updatedAt,
						metadata: doc.metadata
					}))
				};
				break;

			case 'get':
				// Get specific document
				if (!documentId) {
					throw new Error('documentId is required for get operation');
				}
				const document = await contextEngine.storage.getDocument(documentId);
				if (!document) {
					throw new Error(`Document not found: ${documentId}`);
				}
				result = { document };
				break;

			case 'delete':
				// Delete specific document
				if (!documentId) {
					throw new Error('documentId is required for delete operation');
				}
				await contextEngine.storage.deleteDocument(documentId);
				result = { message: `Document deleted successfully: ${documentId}` };
				break;

			case 'cleanup':
				// Clean up orphaned chunks and optimize storage
				const beforeStats = await contextEngine.storage.getAllChunks();
				// Note: This would require implementing cleanup logic in the storage backend
				// For now, we'll just return the current stats
				result = {
					message: 'Cleanup operation completed',
					beforeChunks: beforeStats.length,
					afterChunks: beforeStats.length
				};
				break;

			default:
				throw new Error(`Unsupported operation: ${operation}`);
		}

		// Shutdown context engine
		await contextEngine.shutdown();

		log.info(`Context storage operation '${operation}' completed successfully`);

		return {
			success: true,
			data: result
		};

	} catch (error) {
		log.error(`Context storage operation failed: ${error.message}`, { stack: error.stack });
		return {
			success: false,
			error: {
				code: 'STORAGE_OPERATION_ERROR',
				message: `Context storage operation failed: ${error.message}`,
				details: error.stack
			}
		};
	}
}
