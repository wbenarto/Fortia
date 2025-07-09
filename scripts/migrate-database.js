const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

// Migration functions
const migrations = [
	{
		id: '001_create_data_consent_table',
		description: 'Create data_consent table for simplified consent management',
		up: async () => {
			console.log('Running migration: Create data_consent table...');

			// Check if table already exists
			const tableExists = await sql`
				SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' 
					AND table_name = 'data_consent'
				)
			`;

			if (tableExists[0].exists) {
				console.log('✅ data_consent table already exists, skipping...');
				return;
			}

			// Create simplified data_consent table
			await sql`
				CREATE TABLE data_consent (
					id SERIAL PRIMARY KEY,
					clerk_id VARCHAR(255) UNIQUE NOT NULL,
					data_collection_consent BOOLEAN DEFAULT FALSE,
					consent_version VARCHAR(50) DEFAULT '1.0',
					consent_method VARCHAR(100) DEFAULT 'onboarding',
					ip_address VARCHAR(45),
					user_agent TEXT,
					created_at TIMESTAMP DEFAULT NOW(),
					updated_at TIMESTAMP DEFAULT NOW()
				)
			`;

			// Create indexes
			await sql`CREATE INDEX idx_data_consent_clerk_id ON data_consent(clerk_id)`;
			await sql`CREATE INDEX idx_data_consent_created_at ON data_consent(created_at)`;

			console.log('✅ data_consent table created successfully');
		},
	},

	{
		id: '002_update_privacy_consent_table',
		description: 'Update privacy_consent table to use INET for ip_address',
		up: async () => {
			console.log('Running migration: Update privacy_consent table...');

			// Check if ip_address column exists and its type
			const columnInfo = await sql`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'privacy_consent' 
        AND column_name = 'ip_address'
      `;

			if (columnInfo.length === 0) {
				console.log("✅ ip_address column doesn't exist, skipping...");
				return;
			}

			if (columnInfo[0].data_type === 'inet') {
				console.log('✅ ip_address column already has correct type, skipping...');
				return;
			}

			// Convert TEXT to INET
			await sql`ALTER TABLE privacy_consent ALTER COLUMN ip_address TYPE INET USING ip_address::INET`;
			console.log('✅ privacy_consent.ip_address column updated to INET type');
		},
	},

	{
		id: '003_add_missing_indexes',
		description: 'Add any missing indexes for performance',
		up: async () => {
			console.log('Running migration: Add missing indexes...');

			// Check and create indexes if they don't exist
			const indexes = [
				{ name: 'idx_privacy_consent_clerk_id', table: 'privacy_consent', column: 'clerk_id' },
				{ name: 'idx_privacy_consent_created_at', table: 'privacy_consent', column: 'created_at' },
				{ name: 'idx_data_consent_clerk_id', table: 'data_consent', column: 'clerk_id' },
				{ name: 'idx_data_consent_created_at', table: 'data_consent', column: 'created_at' },
			];

			for (const index of indexes) {
				const indexExists = await sql`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = ${index.name}
          )
        `;

				if (!indexExists[0].exists) {
					await sql`CREATE INDEX ${sql.unsafe(index.name)} ON ${sql.unsafe(index.table)}(${sql.unsafe(index.column)})`;
					console.log(`✅ Created index: ${index.name}`);
				} else {
					console.log(`✅ Index already exists: ${index.name}`);
				}
			}
		},
	},
	{
		id: '004_update_data_consent_schema',
		description: 'Update data_consent table to use simplified schema',
		up: async () => {
			console.log('Running migration: Update data_consent table schema...');

			// Check if data_collection_consent column already exists
			const columnExists = await sql`
				SELECT EXISTS (
					SELECT FROM information_schema.columns 
					WHERE table_name = 'data_consent' 
					AND column_name = 'data_collection_consent'
				)
			`;

			if (columnExists[0].exists) {
				console.log('✅ data_collection_consent column already exists, skipping...');
				return;
			}

			// Add the new simplified column
			await sql`ALTER TABLE data_consent ADD COLUMN data_collection_consent BOOLEAN DEFAULT FALSE`;

			// Update existing records to set data_collection_consent to true if any of the old consent fields were true
			await sql`
				UPDATE data_consent 
				SET data_collection_consent = true 
				WHERE basic_profile = true 
				   OR health_metrics = true 
				   OR nutrition_data = true 
				   OR weight_tracking = true 
				   OR step_tracking = true 
				   OR workout_activities = true
			`;

			console.log('✅ data_consent table schema updated successfully');
		},
	},
];

// Migration tracking table
async function createMigrationsTable() {
	console.log('Creating migrations table...');

	const tableExists = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'migrations'
    )
  `;

	if (!tableExists[0].exists) {
		await sql`
      CREATE TABLE migrations (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
		console.log('✅ migrations table created');
	} else {
		console.log('✅ migrations table already exists');
	}
}

// Get executed migrations
async function getExecutedMigrations() {
	const executed = await sql`SELECT id FROM migrations ORDER BY executed_at`;
	return executed.map(row => row.id);
}

// Mark migration as executed
async function markMigrationExecuted(migrationId, description) {
	await sql`
    INSERT INTO migrations (id, description) 
    VALUES (${migrationId}, ${description})
  `;
}

// Run migrations
async function runMigrations() {
	try {
		console.log('🚀 Starting database migrations...\n');

		// Create migrations table if it doesn't exist
		await createMigrationsTable();

		// Get already executed migrations
		const executedMigrations = await getExecutedMigrations();

		// Run pending migrations
		for (const migration of migrations) {
			if (!executedMigrations.includes(migration.id)) {
				console.log(`\n📋 Migration: ${migration.description}`);
				console.log(`🆔 ID: ${migration.id}`);

				await migration.up();
				await markMigrationExecuted(migration.id, migration.description);

				console.log(`✅ Migration ${migration.id} completed successfully\n`);
			} else {
				console.log(`⏭️  Migration ${migration.id} already executed, skipping...`);
			}
		}

		console.log('🎉 All migrations completed successfully!');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	}
}

// Show migration status
async function showMigrationStatus() {
	try {
		console.log('📊 Migration Status:\n');

		await createMigrationsTable();
		const executedMigrations = await getExecutedMigrations();

		console.log('Executed migrations:');
		if (executedMigrations.length === 0) {
			console.log('  None');
		} else {
			executedMigrations.forEach(id => {
				console.log(`  ✅ ${id}`);
			});
		}

		console.log('\nPending migrations:');
		const pendingMigrations = migrations.filter(m => !executedMigrations.includes(m.id));
		if (pendingMigrations.length === 0) {
			console.log('  None');
		} else {
			pendingMigrations.forEach(migration => {
				console.log(`  ⏳ ${migration.id}: ${migration.description}`);
			});
		}
	} catch (error) {
		console.error('❌ Error checking migration status:', error);
	}
}

// Main execution
const command = process.argv[2];

if (command === 'status') {
	showMigrationStatus();
} else if (command === 'migrate') {
	runMigrations();
} else {
	console.log('Usage:');
	console.log('  node scripts/migrate-database.js migrate  - Run pending migrations');
	console.log('  node scripts/migrate-database.js status   - Show migration status');
	console.log('\nExamples:');
	console.log('  node scripts/migrate-database.js migrate');
	console.log('  node scripts/migrate-database.js status');
}
