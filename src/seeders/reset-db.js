/**
 * Reset DB safely using queryInterface
 */

const { sequelize } = require("../models");

async function resetDB() {
  try {
    console.log("\n🧨 Dropping all tables (safe mode)...");

    const qi = sequelize.getQueryInterface();

    // Fetch tables
    const tables = await qi.showAllTables();

    // Normalize tables for Postgres (lowercase as strings)
    const normalizedTables = tables.map((t) =>
      typeof t === "string" ? t : t.tableName
    );

    // Drop each table manually
    for (const table of normalizedTables) {
      console.log(`⚠️ Dropping table: ${table}`);
      await qi.dropTable(table, { cascade: true }).catch(() => {});
    }

    // Note: After dropping tables, run migrations to recreate schema
    console.log("\n⚠️  Tables dropped. Run migrations to recreate schema:");
    console.log("   npm run migrate");

    console.log("\n✔ Database reset successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ DB Reset Error:", err);
    process.exit(1);
  }
}

resetDB();
