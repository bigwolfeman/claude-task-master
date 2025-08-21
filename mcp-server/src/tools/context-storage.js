/**
 * context-storage.js
 * MCP tool for context engine storage management
 */

import { z } from "zod";
import { contextStorageDirect } from "../core/direct-functions/context-storage.js";
import { handleApiResult, createErrorResponse, withNormalizedProjectRoot } from "./utils.js";

export function registerContextStorageTool(server) {
	server.addTool({
		name: "context_storage",
		description: "Manage context engine storage: get statistics, list documents, cleanup, and more",
		parameters: z.object({
			operation: z.enum(['stats', 'list', 'cleanup', 'get', 'delete']).describe("The operation to perform"),
			documentId: z.string().optional().describe("Document ID for get/delete operations"),
			projectRoot: z.string().optional().describe("Root directory of the project (typically derived from session)")
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				log.info(`Executing context_storage tool with operation: ${args.operation}`);

				const result = await contextStorageDirect(
					{
						operation: args.operation,
						documentId: args.documentId,
						projectRoot: args.projectRoot
					},
					log,
					{ session }
				);

				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in context_storage tool: ${error.message}`);
				return createErrorResponse(`Failed to execute context storage operation: ${error.message}`);
			}
		})
	});
}
