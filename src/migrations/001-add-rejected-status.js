/**
 * Migration: Add 'rejected' status to user_issue status enum
 * 
 * This migration adds the 'rejected' value to the PostgreSQL enum type
 * for the user_issue.status column.
 * 
 * Run: node src/migrations/001-add-rejected-status.js
 */

const { sequelize } = require("../models");

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log("🔄 Adding 'rejected' to enum_user_issue_status...");
    
    // Check if the enum value already exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'rejected' 
        AND enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'enum_user_issue_status'
        )
      ) as exists;
    `);
    
    if (results[0] && results[0].exists) {
      console.log("✔ 'rejected' status already exists in enum");
      return;
    }
    
    // Add the enum value
    await sequelize.query(`
      ALTER TYPE "enum_user_issue_status" ADD VALUE IF NOT EXISTS 'rejected';
    `);
    
    console.log("✔ Successfully added 'rejected' to enum_user_issue_status");
  } catch (error) {
    // If enum doesn't exist yet, it will be created by Sequelize sync
    if (error.message.includes('does not exist')) {
      console.log("⚠ Enum type doesn't exist yet. It will be created on next sync.");
      return;
    }
    throw error;
  }
}

async function down() {
  // Note: PostgreSQL doesn't support removing enum values directly
  // This would require recreating the enum type, which is complex
  // For now, we'll just log a warning
  console.warn("⚠ Cannot remove enum values in PostgreSQL. Manual intervention required.");
  console.warn("   If needed, you would need to:");
  console.warn("   1. Create a new enum without 'rejected'");
  console.warn("   2. Update the column to use the new enum");
  console.warn("   3. Drop the old enum");
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✔ Database connected");
    
    await up();
    
    console.log("\n✔ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}

module.exports = { up, down };

