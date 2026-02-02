'use strict';

/**
 * Database Seeder Runner
 * 
 * Seeds the database with initial data for development/testing.
 * 
 * Usage:
 *   npm run db:seed
 *   npm run db:fresh  (drop + migrate + seed)
 */

const { sequelize } = require('../src/models');
const seedCities = require('./01-cities.seed');
const seedRoles = require('./02-roles.seed');
const seedDepartments = require('./03-departments.seed');
const seedIssues = require('./04-issues.seed');
const seedFlags = require('./05-flags.seed');
const seedUsers = require('./06-users.seed');
const seedAuthorities = require('./07-authorities.seed');
const seedUserRoles = require('./08-user-roles.seed');
const seedAuthorityIssues = require('./09-authority-issues.seed');
const seedAuthorityUsers = require('./10-authority-users.seed');
const seedUserIssues = require('./11-user-issues.seed');
const { resetSequences } = require('./utils/sequence-fixer');

async function runSeeders() {
  try {
    console.log('\n🌱 DATABASE SEEDING STARTED\n');
    console.log('='.repeat(50));

    await sequelize.authenticate();
    console.log('✔ Database connected\n');

    // Run seeders in order (respects foreign key dependencies)
    await seedCities();
    await seedRoles();
    await seedDepartments();
    await seedIssues();
    await seedFlags();
    await seedUsers();
    await seedAuthorities();
    await seedUserRoles();
    await seedAuthorityIssues();
    await seedAuthorityUsers();
    await seedUserIssues();

    // Fix PostgreSQL sequences after seeding with explicit IDs
    await resetSequences({ silent: false });

    console.log('\n' + '='.repeat(50));
    console.log('✔ DATABASE SEEDING COMPLETED\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runSeeders();
