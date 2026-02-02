'use strict';

const { Role } = require('../src/models');

const roles = [
  { id: 1, name: 'admin', description: 'System administrator with full access', is_active: true },
  { id: 2, name: 'authority', description: 'Government authority user who handles issues', is_active: true },
  { id: 3, name: 'citizen', description: 'Regular citizen who reports issues', is_active: true },
];

async function seedRoles() {
  console.log('→ Seeding roles...');
  await Role.bulkCreate(roles, { ignoreDuplicates: true });
  console.log(`  ✔ ${roles.length} roles seeded`);
}

module.exports = seedRoles;
