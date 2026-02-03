'use strict';

const { UserRole } = require('../src/models');

const userRoles = [
  // Admin users (1, 2, 3) have admin role
  { id: 1, user_id: 1, role_id: 1 },
  { id: 2, user_id: 2, role_id: 1 },
  { id: 3, user_id: 3, role_id: 1 },
  
  // Authority users - Jaipur (4, 5, 6)
  { id: 4, user_id: 4, role_id: 2 },
  { id: 5, user_id: 5, role_id: 2 },
  { id: 6, user_id: 6, role_id: 2 },
  
  // Authority users - Jodhpur (7, 8)
  { id: 7, user_id: 7, role_id: 2 },
  { id: 8, user_id: 8, role_id: 2 },
  
  // Authority users - Udaipur (9, 10)
  { id: 9, user_id: 9, role_id: 2 },
  { id: 10, user_id: 10, role_id: 2 },
  
  // Citizen users - Jaipur (11-15)
  { id: 11, user_id: 11, role_id: 3 },
  { id: 12, user_id: 12, role_id: 3 },
  { id: 13, user_id: 13, role_id: 3 },
  { id: 14, user_id: 14, role_id: 3 },
  { id: 15, user_id: 15, role_id: 3 },
  
  // Citizen users - Jodhpur (16-19)
  { id: 16, user_id: 16, role_id: 3 },
  { id: 17, user_id: 17, role_id: 3 },
  { id: 18, user_id: 18, role_id: 3 },
  { id: 19, user_id: 19, role_id: 3 },
  
  // Citizen users - Udaipur (20-23)
  { id: 20, user_id: 20, role_id: 3 },
  { id: 21, user_id: 21, role_id: 3 },
  { id: 22, user_id: 22, role_id: 3 },
  { id: 23, user_id: 23, role_id: 3 },
];

async function seedUserRoles() {
  console.log('→ Seeding user roles...');
  await UserRole.bulkCreate(userRoles, { ignoreDuplicates: true });
  console.log(`  ✔ ${userRoles.length} user-role mappings seeded`);
}

module.exports = seedUserRoles;
