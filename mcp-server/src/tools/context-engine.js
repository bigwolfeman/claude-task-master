/**
 * context-engine.js
 * MCP tool for context engine operations
 */

import { z } from "zod";
import { contextEngineDirect } from "../core/direct-functions/context-engine.js";
import { handleApiResult, createErrorResponse, withNormalizedProjectRoot } from "./utils.js";

export function registerContextEngineTool(server) {
	server.addTool({
		name: "context_engine",
		description: "Generate Minimally Sufficient Evidence (MSE) responses using the context engine",
		parameters: z.object({
			query: z.string().describe("The query to answer with MSE"),
			maxTokens: z.number().optional().describe("Maximum tokens for the response (default: 4000)"),
			enableCompression: z.boolean().optional().describe("Whether to enable compression (default: true)"),
			projectRoot: z.string().optional().describe("Root directory of the project (typically derived from session)")
		}),
		execute: withNormalizedProjectRoot(async (args, { log, session }) => {
			try {
				log.info(`Executing context_engine tool with query: "${args.query.substring(0, 100)}${args.query.length > 100 ? '...' : ''}"`);

				const result = await contextEngineDirect(
					{
						query: args.query,
						maxTokens: args.maxTokens || 4000,
						enableCompression: args.enableCompression !== false,
						projectRoot: args.projectRoot
					},
					log,
					{ session }
				);

				return handleApiResult(result, log);
			} catch (error) {
				log.error(`Error in context_engine tool: ${error.message}`);
				return createErrorResponse(`Failed to execute context engine: ${error.message}`);
			}
		})
	});
}
