/**
 * Migration Runner
 * 
 * Runs all migrations in the migrations folder in order using Sequelize's queryInterface.
 * 
 * Usage: node src/migrations/run-migrations.js
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
    dialectOptions: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('rds.amazonaws.com') ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  }
);

async function runMigrations() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log("✔ Database connected\n");

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith(".js") && file !== "run-migrations.js" && !file.startsWith("001-"))
      .sort(); // Sort to ensure order

    console.log(`📦 Found ${files.length} migration(s)\n`);

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`🔄 Running: ${file}`);
      
      const migration = require(migrationPath);
      
      if (typeof migration.up === "function") {
        await migration.up(queryInterface, Sequelize);
      } else {
        console.warn(`⚠ ${file} doesn't export an 'up' function, skipping`);
      }
      
      console.log(`✔ Completed: ${file}\n`);
    }

    console.log("✔ All migrations completed successfully!");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration runner failed:", error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigrations();

