/**
 * migrations.ts
 * Database migration system for Context Engine SQLite backend
 * Handles schema versioning and incremental updates
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
	version: number;
	description: string;
	up: string;
	down?: string;
}

/**
 * Database Migration Manager
 * Handles schema versioning and incremental updates
 */
export class MigrationManager {
	private db: Database.Database;
	private migrations: Migration[] = [];

	constructor(db: Database.Database) {
		this.db = db;
		this.initializeMigrations();
	}

	/**
	 * Initialize migration definitions
	 */
	private initializeMigrations(): void {
		// Migration 1: Initial schema
		this.migrations.push({
			version: 1,
			description: 'Initial Context Engine schema with tri-index memory support',
			up: readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
		});

		// Future migrations can be added here
		// Example:
		// this.migrations.push({
		//   version: 2,
		//   description: 'Add fulltext search support',
		//   up: `
		//     CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
		//       id UNINDEXED, text, content='chunks', content_rowid='rowid'
		//     );
		//   `
		// });
	}

	/**
	 * Get current database schema version
	 */
	getCurrentVersion(): number {
		try {
			const result = this.db
				.prepare('SELECT MAX(version) as version FROM schema_version')
				.get() as { version: number | null };
			return result?.version || 0;
		} catch (error) {
			// Table doesn't exist yet
			return 0;
		}
	}

	/**
	 * Get latest available migration version
	 */
	getLatestVersion(): number {
		return Math.max(...this.migrations.map(m => m.version));
	}

	/**
	 * Check if migrations are needed
	 */
	needsMigration(): boolean {
		return this.getCurrentVersion() < this.getLatestVersion();
	}

	/**
	 * Run all pending migrations
	 */
	migrate(): void {
		const currentVersion = this.getCurrentVersion();
		const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

		if (pendingMigrations.length === 0) {
			console.log('Database is up to date');
			return;
		}

		console.log(`Running ${pendingMigrations.length} pending migrations...`);

		// Run migrations in a transaction
		const runMigrations = this.db.transaction((migrations: Migration[]) => {
			for (const migration of migrations) {
				console.log(`Applying migration ${migration.version}: ${migration.description}`);
				
				try {
					// Execute migration SQL
					this.db.exec(migration.up);
					
					// Record migration in schema_version table
					this.db
						.prepare(`
							INSERT OR REPLACE INTO schema_version (version, description, applied_at)
							VALUES (?, ?, datetime('now'))
						`)
						.run(migration.version, migration.description);
					
					console.log(`✅ Migration ${migration.version} completed`);
				} catch (error) {
					console.error(`❌ Migration ${migration.version} failed:`, error);
					throw error;
				}
			}
		});

		try {
			runMigrations(pendingMigrations);
			console.log('🎉 All migrations completed successfully');
		} catch (error) {
			console.error('Migration failed, rolling back transaction');
			throw error;
		}
	}

	/**
	 * Create a new migration file template
	 */
	createMigration(description: string): Migration {
		const version = this.getLatestVersion() + 1;
		const migration: Migration = {
			version,
			description,
			up: `-- Migration ${version}: ${description}\n-- Add your SQL here\n`,
			down: `-- Rollback for migration ${version}\n-- Add rollback SQL here\n`
		};

		console.log(`Migration template created for version ${version}`);
		console.log('Add the migration to the migrations array in migrations.ts');
		
		return migration;
	}

	/**
	 * Get migration history
	 */
	getMigrationHistory(): Array<{ version: number; description: string; applied_at: string }> {
		try {
			return this.db
				.prepare('SELECT version, description, applied_at FROM schema_version ORDER BY version')
				.all() as Array<{ version: number; description: string; applied_at: string }>;
		} catch (error) {
			return [];
		}
	}

	/**
	 * Validate database schema integrity
	 */
	validateSchema(): boolean {
		try {
			// Check that all expected tables exist
			const tables = [
				'documents', 'chunks', 'atoms', 'coverage', 'pairwise', 'answers',
				'graph_nodes', 'graph_edges', 'summaries', 'summary_chunks', 'schema_version'
			];

			const existingTables = this.db
				.prepare("SELECT name FROM sqlite_master WHERE type='table'")
				.all() as Array<{ name: string }>;

			const existingTableNames = new Set(existingTables.map(t => t.name));

			for (const table of tables) {
				if (!existingTableNames.has(table)) {
					console.error(`Missing table: ${table}`);
					return false;
				}
			}

			// Check foreign key constraints are enabled
			const fkResult = this.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
			if (fkResult.foreign_keys !== 1) {
				console.error('Foreign key constraints are not enabled');
				return false;
			}

			console.log('✅ Database schema validation passed');
			return true;
		} catch (error) {
			console.error('Schema validation failed:', error);
			return false;
		}
	}

	/**
	 * Reset database (drop all tables and recreate)
	 * WARNING: This will delete all data!
	 */
	reset(): void {
		console.warn('⚠️  Resetting database - all data will be lost!');
		
		// Get all table names
		const tables = this.db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
			.all() as Array<{ name: string }>;

		// Drop all tables
		for (const table of tables) {
			this.db.exec(`DROP TABLE IF EXISTS ${table.name}`);
		}

		// Run initial migration
		this.migrate();
	}

	/**
	 * Database maintenance and optimization
	 */
	optimize(): void {
		console.log('Running database optimization...');
		
		try {
			// Analyze tables for better query planning
			this.db.exec('ANALYZE');
			
			// Vacuum to reclaim space and defragment
			this.db.exec('VACUUM');
			
			// Update table statistics
			this.db.exec('PRAGMA optimize');
			
			console.log('✅ Database optimization completed');
		} catch (error) {
			console.error('Database optimization failed:', error);
			throw error;
		}
	}
}
