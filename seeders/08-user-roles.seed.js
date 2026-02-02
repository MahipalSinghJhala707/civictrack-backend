'use strict';

const { UserRole } = require('../src/models');

const userRoles = [
  // Admin (user 1) has admin role
  { id: 1, user_id: 1, role_id: 1 },
  
  // Authority users (2, 3, 4) have authority role
  { id: 2, user_id: 2, role_id: 2 },
  { id: 3, user_id: 3, role_id: 2 },
  { id: 4, user_id: 4, role_id: 2 },
  
  // Citizen users (5, 6, 7, 8) have citizen role
  { id: 5, user_id: 5, role_id: 3 },
  { id: 6, user_id: 6, role_id: 3 },
  { id: 7, user_id: 7, role_id: 3 },
  { id: 8, user_id: 8, role_id: 3 },
];

async function seedUserRoles() {
  console.log('→ Seeding user roles...');
  await UserRole.bulkCreate(userRoles, { ignoreDuplicates: true });
  console.log(`  ✔ ${userRoles.length} user-role mappings seeded`);
}

module.exports = seedUserRoles;
