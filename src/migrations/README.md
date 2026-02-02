# Database Migrations

This directory contains Sequelize migrations that manage the database schema.

## Philosophy

- **Migrations are the single source of truth** for the database schema
- **No `sequelize.sync()`** is used anywhere in the codebase
- **SequelizeMeta table** tracks which migrations have been executed
- All migrations use **transactions** for atomic operations
- All migrations have **reversible `down()` methods**

## Available Scripts

```bash
# Run all pending migrations
npm run db:migrate

# Show migration status
npm run db:migrate:status

# Roll back all migrations (DANGEROUS - use with caution)
npm run db:migrate:undo

# Drop all tables (clean slate)
npm run db:drop

# Reset database (drop + migrate)
npm run db:reset

# Seed database with initial data
npm run db:seed

# Full reset: drop tables, run migrations, seed data
npm run db:fresh
```

## Migration Order

Migrations are executed in alphabetical order by filename. The naming convention is:

```
YYYYMMDDHHMMSS-description.js
```

Current migration order (February 2, 2026):
1. `20260202100000-create-cities.js` - Cities table (first-class entity)
2. `20260202100001-create-roles.js` - Roles table
3. `20260202100002-create-departments.js` - Departments table
4. `20260202100003-create-issues.js` - Issue categories table
5. `20260202100004-create-flags.js` - Flags table
6. `20260202100005-create-users.js` - Users table (with city_id FK)
7. `20260202100006-create-authorities.js` - Authorities table (with dept_id, city_id FK)
8. `20260202100007-create-user-role.js` - User-Role junction table
9. `20260202100008-create-authority-issue.js` - Authority-Issue junction table
10. `20260202100009-create-user-issue.js` - User reports table (with city_id FK)
11. `20260202100010-create-issue-images.js` - Issue images table
12. `20260202100011-create-logs.js` - Status change logs table
13. `20260202100012-create-authority-user.js` - Authority-User junction table
14. `20260202100013-create-user-issue-flag.js` - Report flags table

## Creating New Migrations

1. Create a new file with the naming convention above
2. Export `up(queryInterface, Sequelize)` and `down(queryInterface, Sequelize)` functions
3. Use transactions for safety:

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Your migration code here
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Your rollback code here
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
```

## City as First-Class Entity

The `cities` table is created first and referenced by:
- `users.city_id` (nullable) - ON DELETE SET NULL
- `authorities.city_id` (nullable) - ON DELETE SET NULL
- `user_issue.city_id` (nullable) - ON DELETE SET NULL

This supports multi-city deployments while maintaining backward compatibility.

