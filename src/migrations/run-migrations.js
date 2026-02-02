'use strict';

/**
 * Migration Runner for CivicTrack
 * 
 * This script runs Sequelize migrations and tracks them via SequelizeMeta table.
 * 
 * Usage:
 *   node run-migrations.js          # Run all pending migrations
 *   node run-migrations.js --status # Show migration status
 *   node run-migrations.js --down   # Rollback all migrations
 */

const path = require('path');
const fs = require('fs');
const sequelize = require('../config/db.config');
const { Sequelize } = require('sequelize');

const MIGRATIONS_DIR = __dirname;
const META_TABLE = 'SequelizeMeta';

/**
 * Ensure SequelizeMeta table exists
 */
async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${META_TABLE}" (
      "name" VARCHAR(255) NOT NULL PRIMARY KEY
    );
  `);
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
  const [results] = await sequelize.query(`SELECT name FROM "${META_TABLE}" ORDER BY name;`);
  return results.map(r => r.name);
}

/**
 * Mark a migration as executed
 */
async function markMigrationExecuted(name) {
  await sequelize.query(`INSERT INTO "${META_TABLE}" (name) VALUES (:name);`, {
    replacements: { name }
  });
}

/**
 * Remove migration from executed list
 */
async function unmarkMigrationExecuted(name) {
  await sequelize.query(`DELETE FROM "${META_TABLE}" WHERE name = :name;`, {
    replacements: { name }
  });
}

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'run-migrations.js')
    .sort();
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  await ensureMetaTable();
  
  const executed = await getExecutedMigrations();
  const files = getMigrationFiles();
  const pending = files.filter(f => !executed.includes(f));
  
  if (pending.length === 0) {
    console.log('✓ All migrations are up to date');
    return;
  }
  
  console.log(`Running ${pending.length} pending migration(s)...\n`);
  
  for (const file of pending) {
    const migration = require(path.join(MIGRATIONS_DIR, file));
    
    console.log(`→ Running: ${file}`);
    
    try {
      await migration.up(sequelize.getQueryInterface(), Sequelize);
      await markMigrationExecuted(file);
      console.log(`  ✓ Completed: ${file}\n`);
    } catch (error) {
      console.error(`  ✗ Failed: ${file}`);
      console.error(`    Error: ${error.message}\n`);
      throw error;
    }
  }
  
  console.log('✓ All migrations completed successfully');
}

/**
 * Show migration status
 */
async function showStatus() {
  await ensureMetaTable();
  
  const executed = await getExecutedMigrations();
  const files = getMigrationFiles();
  
  console.log('Migration Status:\n');
  console.log('Status     | Migration');
  console.log('-----------|' + '-'.repeat(60));
  
  for (const file of files) {
    const status = executed.includes(file) ? '✓ Applied ' : '○ Pending ';
    console.log(`${status} | ${file}`);
  }
  
  const pending = files.filter(f => !executed.includes(f));
  console.log(`\nTotal: ${files.length} | Applied: ${executed.length} | Pending: ${pending.length}`);
}

/**
 * Rollback all migrations (in reverse order)
 */
async function rollbackAll() {
  await ensureMetaTable();
  
  const executed = await getExecutedMigrations();
  
  if (executed.length === 0) {
    console.log('✓ No migrations to rollback');
    return;
  }
  
  // Reverse order for rollback
  const toRollback = [...executed].reverse();
  
  console.log(`Rolling back ${toRollback.length} migration(s)...\n`);
  
  for (const file of toRollback) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠ Skipping missing file: ${file}`);
      await unmarkMigrationExecuted(file);
      continue;
    }
    
    const migration = require(migrationPath);
    
    console.log(`← Rolling back: ${file}`);
    
    try {
      await migration.down(sequelize.getQueryInterface(), Sequelize);
      await unmarkMigrationExecuted(file);
      console.log(`  ✓ Rolled back: ${file}\n`);
    } catch (error) {
      console.error(`  ✗ Rollback failed: ${file}`);
      console.error(`    Error: ${error.message}\n`);
      throw error;
    }
  }
  
  console.log('✓ All migrations rolled back');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  try {
    await sequelize.authenticate();
    console.log('Database connected\n');
    
    if (args.includes('--status')) {
      await showStatus();
    } else if (args.includes('--down')) {
      await rollbackAll();
    } else {
      await runMigrations();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

main();

