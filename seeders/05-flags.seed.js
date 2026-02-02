'use strict';

const { Flag } = require('../src/models');

const flags = [
  { id: 1, name: 'Spam', description: 'Reported issue is spam or fake' },
  { id: 2, name: 'Duplicate', description: 'Issue has already been reported' },
  { id: 3, name: 'Inappropriate', description: 'Contains inappropriate content' },
  { id: 4, name: 'Wrong Category', description: 'Issue is in wrong category' },
  { id: 5, name: 'Resolved', description: 'Issue has already been resolved' },
];

async function seedFlags() {
  console.log('→ Seeding flags...');
  await Flag.bulkCreate(flags, { ignoreDuplicates: true });
  console.log(`  ✔ ${flags.length} flags seeded`);
}

module.exports = seedFlags;
