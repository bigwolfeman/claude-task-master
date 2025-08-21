/**
 * ingest-document.js
 * MCP tool for document ingestion operations
 */

import { z } from "zod";
import { ingestDocumentDirect } from "../core/direct-functions/ingest-document.js";
import { handleApiResult, createErrorResponse, withNormalizedProjectRoot } from "./utils.js";

export function registerIngestDocumentTool(server) {
	server.addTool({
		name: "ingest_document",
		description: "Ingest a document into the context engine storage for later retrieval",
		parameters: z.object({
			filePath: z.string().describe("Path to the document file to ingest"),
			documentId: z.string().optional().describe("Custom document ID (auto-generated if not provided)"),
			metadata: z.record(z.any()).optional().describe("Additional metadata for the document"),
			projectRoot: z.string().optional().describe("Root directory of the project (typically derived from session)")
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				log.info(`Executing ingest_document tool for file: ${args.filePath}`);

				const result = await ingestDocumentDirect(
					{
						filePath: args.filePath,
						documentId: args.documentId,
						metadata: args.metadata || {},
						projectRoot: args.projectRoot
					},
					log,
					{ session }
				);

				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in ingest_document tool: ${error.message}`);
				return createErrorResponse(`Failed to ingest document: ${error.message}`);
			}
		})
	});
}
