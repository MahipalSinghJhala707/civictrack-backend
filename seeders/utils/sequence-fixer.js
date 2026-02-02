'use strict';

/**
 * PostgreSQL Sequence Fixer
 * 
 * Resets auto-increment sequences to the correct value after seeding
 * with explicit IDs. This prevents "duplicate key" errors on inserts.
 */

const { sequelize } = require('../../src/models');

const TABLES = [
  'cities',
  'roles',
  'departments',
  'issues',
  'flags',
  'users',
  'authorities',
  'user_role',
  'authority_issue',
  'authority_user',
  'user_issue',
  'issue_images',
  'logs',
  'user_issue_flag',
];

async function resetSequences(options = {}) {
  const { silent = false } = options;

  if (!silent) {
    console.log('\n🔄 Resetting PostgreSQL sequences...');
  }

  for (const table of TABLES) {
    try {
      await sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 1),
          true
        );
      `);
      if (!silent) {
        console.log(`   ✔ ${table}`);
      }
    } catch (err) {
      // Ignore errors for tables that don't exist yet or have no sequence
      if (!silent && !err.message.includes('does not exist')) {
        console.warn(`   ⚠ ${table}: ${err.message}`);
      }
    }
  }

  if (!silent) {
    console.log('✔ Sequences reset');
  }
}

module.exports = { resetSequences };

