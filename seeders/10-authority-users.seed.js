'use strict';

const { AuthorityUser } = require('../src/models');

// Link authority users to their respective authorities
const authorityUsers = [
  // Jaipur authority users (4, 5, 6) linked to Jaipur authorities (1, 2, 3, 4)
  { id: 1, authority_id: 1, user_id: 4 },  // Priya -> JMC Zone 1 PWD
  { id: 2, authority_id: 2, user_id: 5 },  // Amit -> JMC Zone 1 Water
  { id: 3, authority_id: 3, user_id: 6 },  // Kavita -> JMC Zone 2 PWD
  
  // Jodhpur authority users (7, 8) linked to Jodhpur authorities (5, 6)
  { id: 4, authority_id: 5, user_id: 7 },  // Sunita -> JoMC PWD
  { id: 5, authority_id: 6, user_id: 8 },  // Mohan -> JoMC Water Supply
  
  // Udaipur authority users (9, 10) linked to Udaipur authority (7)
  { id: 6, authority_id: 7, user_id: 9 },  // Rekha -> UMC Roads
  { id: 7, authority_id: 7, user_id: 10 }, // Suresh -> UMC Roads (same authority, different user)
];

async function seedAuthorityUsers() {
  console.log('→ Seeding authority-user links...');
  await AuthorityUser.bulkCreate(authorityUsers, { ignoreDuplicates: true });
  console.log(`  ✔ ${authorityUsers.length} authority-user links seeded`);
}

module.exports = seedAuthorityUsers;
