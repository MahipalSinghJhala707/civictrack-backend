/**
 * Fix PostgreSQL Sequences
 * 
 * Standalone utility to reset all auto-increment sequences to the correct values.
 * Useful when you need to fix sequences without running the full seed.
 * 
 * Run: node src/seeders/fix-sequences.js
 * Or: npm run fix-sequences
 */

const { resetSequences } = require("./utils/sequence-fixer.js");

async function fixSequences() {
  try {
    await resetSequences();
    console.log("\n✔ All sequences fixed!\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error fixing sequences:", err);
    process.exit(1);
  }
}

fixSequences();

