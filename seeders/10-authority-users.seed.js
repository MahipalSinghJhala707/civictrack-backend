'use strict';

const { AuthorityUser } = require('../src/models');

// Link authority users to their respective authorities
const authorityUsers = [
  { id: 1, authority_id: 1, user_id: 2 },  // Priya -> JMC Zone 1 PWD
  { id: 2, authority_id: 2, user_id: 3 },  // Amit -> JMC Zone 1 Water
  { id: 3, authority_id: 5, user_id: 4 },  // Sunita -> Jodhpur PWD
];

async function seedAuthorityUsers() {
  console.log('→ Seeding authority-user links...');
  await AuthorityUser.bulkCreate(authorityUsers, { ignoreDuplicates: true });
  console.log(`  ✔ ${authorityUsers.length} authority-user links seeded`);
}

module.exports = seedAuthorityUsers;
