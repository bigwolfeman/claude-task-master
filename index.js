#!/usr/bin/env node

/**
 * Task Master
 * Copyright (c) 2025 Eyal Toledano, Ralph Khreish
 *
 * This software is licensed under the MIT License with Commons Clause.
 * You may use this software for any purpose, including commercial applications,
 * and modify and redistribute it freely, subject to the following restrictions:
 *
 * 1. You may not sell this software or offer it as a service.
 * 2. The origin of this software must not be misrepresented.
 * 3. Altered source versions must be plainly marked as such.
 *
 * For the full license text, see the LICENSE file in the root directory.
 */

/**
 * Claude Task Master
 * A task management system for AI-driven development with Claude
 */

// This file serves as the main entry point for the package
// The primary functionality is provided through the CLI commands

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Get package information
const packageJson = require('./package.json');

// Export the path to the dev.js script for programmatic usage
export const devScriptPath = resolve(__dirname, './scripts/dev.js');

// Export a function to initialize a new project programmatically
export const initProject = async (options = {}) => {
	const init = await import('./scripts/init.js');
	return init.initializeProject(options);
};

// Export a function to run init as a CLI command
export const runInitCLI = async (options = {}) => {
	try {
		const init = await import('./scripts/init.js');
		const result = await init.initializeProject(options);
		return result;
	} catch (error) {
		console.error('Initialization failed:', error.message);
		if (process.env.DEBUG === 'true') {
			console.error('Debug stack trace:', error.stack);
		}
		throw error; // Re-throw to be handled by the command handler
	}
};

// Export version information
export const version = packageJson.version;

// CLI implementation
if (import.meta.url === `file://${process.argv[1]}`) {
	const program = new Command();

	program
		.name('task-master')
		.description('Claude Task Master CLI')
		.version(version);

	program
		.command('init')
		.description('Initialize a new project')
		.option('-y, --yes', 'Skip prompts and use default values')
		.option('-n, --name <n>', 'Project name')
		.option('-d, --description <description>', 'Project description')
		.option('-v, --version <version>', 'Project version', '0.1.0')
		.option('-a, --author <author>', 'Author name')
		.option('--skip-install', 'Skip installing dependencies')
		.option('--dry-run', 'Show what would be done without making changes')
		.option('--aliases', 'Add shell aliases (tm, taskmaster)')
		.option('--no-aliases', 'Skip shell aliases (tm, taskmaster)')
		.option('--git', 'Initialize Git repository')
		.option('--no-git', 'Skip Git repository initialization')
		.option('--git-tasks', 'Store tasks in Git')
		.option('--no-git-tasks', 'No Git storage of tasks')
		.action(async (cmdOptions) => {
			try {
				await runInitCLI(cmdOptions);
			} catch (err) {
				console.error('Init failed:', err.message);
				process.exit(1);
			}
		});

	program
		.command('dev')
		.description('Run the dev.js script')
		.allowUnknownOption(true)
		.action(() => {
			const args = process.argv.slice(process.argv.indexOf('dev') + 1);
			const child = spawn('node', [devScriptPath, ...args], {
				stdio: 'inherit',
				cwd: process.cwd()
			});

			child.on('close', (code) => {
				process.exit(code);
			});
		});

	// Add shortcuts for common dev.js commands
	program
		.command('list')
		.description('List all tasks')
		.action(() => {
			const child = spawn('node', [devScriptPath, 'list'], {
				stdio: 'inherit',
				cwd: process.cwd()
			});

			child.on('close', (code) => {
				process.exit(code);
			});
		});

	program
		.command('next')
		.description('Show the next task to work on')
		.action(() => {
			const child = spawn('node', [devScriptPath, 'next'], {
				stdio: 'inherit',
				cwd: process.cwd()
			});

			child.on('close', (code) => {
				process.exit(code);
			});
		});

	program
		.command('generate')
		.description('Generate task files')
		.action(() => {
			const child = spawn('node', [devScriptPath, 'generate'], {
				stdio: 'inherit',
				cwd: process.cwd()
			});

			child.on('close', (code) => {
				process.exit(code);
			});
		});

	// Context Engine Commands
	program
		.command('ingest')
		.description('Ingest documents into the context engine')
		.argument('<path>', 'Path to document or directory to ingest')
		.option(
			'-f, --file <file>',
			'Path to the context engine configuration file',
			'.taskmaster/context-engine/config.json'
		)
		.option(
			'--chunk-size <size>',
			'Size of text chunks to create (default: 1000)',
			'1000'
		)
		.option(
			'--chunk-overlap <overlap>',
			'Overlap between chunks (default: 200)',
			'200'
		)
		.action(async (path, options) => {
			try {
				const { runIngestCLI } = await import('./scripts/modules/context-engine-cli.js');
				await runIngestCLI(path, {
					file: options.file,
					chunkSize: options.chunkSize,
					chunkOverlap: options.chunkOverlap
				});
			} catch (error) {
				console.error(`Error ingesting documents: ${error.message}`);
				process.exit(1);
			}
		});

	program
		.command('build-graph')
		.description('Build the knowledge graph from ingested documents')
		.option(
			'-f, --file <file>',
			'Path to the context engine configuration file',
			'.taskmaster/context-engine/config.json'
		)
		.option(
			'--force',
			'Force rebuild of the entire graph'
		)
		.action(async (options) => {
			try {
				const { runBuildGraphCLI } = await import('./scripts/modules/context-engine-cli.js');
				await runBuildGraphCLI({
					file: options.file,
					force: options.force
				});
			} catch (error) {
				console.error(`Error building graph: ${error.message}`);
				process.exit(1);
			}
		});

	program
		.command('query')
		.description('Query the context engine for relevant information')
		.argument('<query>', 'The query to search for')
		.option(
			'-f, --file <file>',
			'Path to the context engine configuration file',
			'.taskmaster/context-engine/config.json'
		)
		.option(
			'--limit <number>',
			'Maximum number of results to return (default: 10)',
			'10'
		)
		.option(
			'--threshold <score>',
			'Minimum relevance score (0.0-1.0, default: 0.7)',
			'0.7'
		)
		.action(async (query, options) => {
			try {
				const { runQueryCLI } = await import('./scripts/modules/context-engine-cli.js');
				await runQueryCLI(query, {
					file: options.file,
					limit: options.limit,
					threshold: options.threshold
				});
			} catch (error) {
				console.error(`Error querying context engine: ${error.message}`);
				process.exit(1);
			}
		});

	program
		.command('proof')
		.description('Generate proof of evidence for a query')
		.argument('<query>', 'The query to generate proof for')
		.option(
			'-f, --file <file>',
			'Path to the context engine configuration file',
			'.taskmaster/context-engine/config.json'
		)
		.option(
			'--max-evidence <number>',
			'Maximum number of evidence pieces to include (default: 5)',
			'5'
		)
		.option(
			'--min-confidence <score>',
			'Minimum confidence score (0.0-1.0, default: 0.8)',
			'0.8'
		)
		.action(async (query, options) => {
			try {
				const { runProofCLI } = await import('./scripts/modules/context-engine-cli.js');
				await runProofCLI(query, {
					file: options.file,
					maxEvidence: options.maxEvidence,
					minConfidence: options.minConfidence
				});
			} catch (error) {
				console.error(`Error generating proof: ${error.message}`);
				process.exit(1);
			}
		});

	program.parse(process.argv);
}
