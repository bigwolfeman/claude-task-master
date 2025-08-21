/**
 * context-engine.js
 * Direct function implementation for context engine operations
 */

import path from 'path';
import { initializeContextEngine } from '../../../../src/context-engine/init.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for context engine operations.
 * Provides access to the full MSE (Minimally Sufficient Evidence) generation pipeline.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.query - The query to answer with MSE (required)
 * @param {string} [args.projectRoot] - Project root path
 * @param {number} [args.maxTokens=4000] - Maximum tokens for the response
 * @param {boolean} [args.enableCompression=true] - Whether to enable compression
 * @param {Object} log - Logger object
 * @param {Object} context - Additional context (session)
 * @returns {Promise<Object>} - Result object with MSE response
 */
export async function contextEngineDirect(args, log, context = {}) {
	// Destructure expected args
	const {
		query,
		projectRoot,
		maxTokens = 4000,
		enableCompression = true
	} = args;
	const { session } = context;

	try {
		// Check required parameters
		if (!query || typeof query !== 'string' || query.trim().length === 0) {
			log.error('Missing or invalid required parameter: query');
			return {
				success: false,
				error: {
					code: 'MISSING_PARAMETER',
					message: 'The query parameter is required and must be a non-empty string'
				}
			};
		}

		log.info(`Processing context engine query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

		// Initialize context engine with configuration
		const contextEngine = await initializeContextEngine({
			projectRoot,
			enableLogging: false // Disable logging in MCP context
		});

		// Generate MSE response
		log.info('Generating MSE response...');
		const response = await contextEngine.orchestrator.answerWithMSE(query, maxTokens);

		// Shutdown context engine
		await contextEngine.shutdown();

		log.info('Context engine operation completed successfully');

		return {
			success: true,
			data: {
				query,
				response: response.response,
				proof: response.proof,
				metadata: {
					totalTokens: response.proof.totalTokens,
					coverage: response.proof.coverage,
					confidence: response.proof.confidence,
					compressionEnabled: enableCompression
				}
			}
		};

	} catch (error) {
		log.error(`Context engine operation failed: ${error.message}`, { stack: error.stack });
		return {
			success: false,
			error: {
				code: 'CONTEXT_ENGINE_ERROR',
				message: `Context engine operation failed: ${error.message}`,
				details: error.stack
			}
		};
	}
}
