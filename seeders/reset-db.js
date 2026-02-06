'use strict';

/**
 * Database Reset Script
 * 
 * Drops all tables and ENUMs from the database.
 * Run migrations after this to recreate the schema.
 * 
 * Usage:
 *   npm run db:drop
 *   npm run db:reset  (drop + migrate)
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('rds.amazonaws.com')
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}
  }
);

async function resetDatabase() {
  try {
    await sequelize.authenticate();
    console.log('\n✔ Database connected');
    console.log('\n🗑️  Dropping all tables...\n');

    await sequelize.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables in public schema with CASCADE (no superuser needed)
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          RAISE NOTICE 'Dropped table: %', r.tablename;
        END LOOP;

        -- Drop all enum types with CASCADE (covers dependent defaults)
        FOR r IN (
          SELECT typname FROM pg_type t 
          JOIN pg_namespace n ON t.typnamespace = n.oid 
          WHERE n.nspname = 'public' AND t.typtype = 'e'
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
          RAISE NOTICE 'Dropped enum: %', r.typname;
        END LOOP;
      END $$;
    `);

    console.log('✔ All tables and enums dropped\n');
    console.log('Next steps:');
    console.log('  npm run db:migrate   # Recreate schema');
    console.log('  npm run db:seed      # Seed data\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

resetDatabase();
