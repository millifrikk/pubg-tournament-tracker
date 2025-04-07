// Script to run database migrations
const fs = require('fs');
const path = require('path');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { db } = require('./connection');

const MIGRATIONS_DIR = path.join(__dirname, '../../../docker/init-scripts/migrations');

/**
 * Run all migrations in the migrations directory
 */
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to ensure order
    
    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Run each migration if not already executed
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        await runMigration(migrationFile);
      } else {
        console.log(`Migration ${migrationFile} already executed, skipping`);
      }
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

/**
 * Ensure migrations table exists
 */
async function ensureMigrationsTable() {
  try {
    // Check if migrations table exists
    const tableExists = await db.schema.hasTable('migrations');
    
    // Create migrations table if not exists
    if (!tableExists) {
      console.log('Creating migrations table...');
      await db.schema.createTable('migrations', table => {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.timestamp('executed_at').defaultTo(db.fn.now());
      });
    }
  } catch (error) {
    console.error('Error ensuring migrations table exists:', error);
    throw error;
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
  try {
    const result = await db('migrations').select('name').orderBy('id', 'asc');
    return result.map(row => row.name);
  } catch (error) {
    console.error('Error getting executed migrations:', error);
    throw error;
  }
}

/**
 * Run a specific migration
 */
async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    // Begin transaction
    await db.transaction(async trx => {
      // Read migration SQL
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute migration SQL
      await trx.raw(sql);
      
      // Record migration execution
      await trx('migrations').insert({
        name: migrationFile,
        executed_at: new Date()
      });
      
      console.log(`Migration ${migrationFile} executed successfully`);
    });
  } catch (error) {
    console.error(`Error executing migration ${migrationFile}:`, error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
