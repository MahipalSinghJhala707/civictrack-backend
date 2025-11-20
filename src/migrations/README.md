# Database Migrations

This directory contains database migration scripts for schema changes.

## Available Migrations

### 001-add-rejected-status.js
Adds the `'rejected'` status value to the `user_issue.status` enum type.

**Why this migration is needed:**
- The model was updated to include `'rejected'` in the enum
- PostgreSQL enum types cannot be automatically altered by Sequelize's `sync()`
- This migration manually adds the new enum value to the database

## Running Migrations

### Run all migrations:
```bash
npm run migrate
```

### Run a specific migration:
```bash
npm run migrate:add-rejected
```

Or directly:
```bash
node src/migrations/001-add-rejected-status.js
```

## Migration Structure

Each migration file should export:
- `up()` - Function to apply the migration
- `down()` - Function to rollback the migration (optional)

Example:
```javascript
async function up() {
  // Migration logic here
}

async function down() {
  // Rollback logic here (if possible)
}

module.exports = { up, down };
```

## Notes

- Migrations are run in alphabetical order (by filename)
- Use numbered prefixes (001-, 002-, etc.) to ensure correct order
- PostgreSQL enum changes require raw SQL - Sequelize's `alter: true` won't work
- Always test migrations on a development database first

