/**
 * Utility to reset PostgreSQL sequences
 * Used by seeders to fix auto-increment sequences after seeding with explicit IDs
 */

const { sequelize } = require("../../models");

const SEQUENCE_TABLES = [
  { table: "users", column: "id" },
  { table: "roles", column: "id" },
  { table: "issues", column: "id" },
  { table: "authorities", column: "id" },
  { table: "departments", column: "id" },
  { table: "flags", column: "id" },
  { table: "user_issue", column: "id" },
  { table: "issue_images", column: "id" },
  { table: "logs", column: "id" },
  { table: "user_issue_flag", column: "id" },
  { table: "user_role", column: "id" },
  { table: "authority_issue", column: "id" },
  { table: "authority_user", column: "id" },
];

async function resetSequences(options = {}) {
  const { silent = false } = options;
  
  if (!silent) {
    console.log("\n🔄 Resetting PostgreSQL sequences...");
  }

  for (const { table, column } of SEQUENCE_TABLES) {
    try {
      await sequelize.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', '${column}'),
          COALESCE((SELECT MAX(${column}) FROM ${table}), 1),
          true
        );
      `);
      if (!silent) {
        console.log(`  ✔ Reset sequence for ${table}.${column}`);
      }
    } catch (err) {
      // Ignore errors for tables without sequences or if sequence doesn't exist
      if (!err.message.includes("does not exist")) {
        if (!silent) {
          console.warn(`  ⚠ Could not reset sequence for ${table}.${column}: ${err.message}`);
        }
      }
    }
  }

  if (!silent) {
    console.log("✔ Sequences reset");
  }
}

module.exports = { resetSequences };

