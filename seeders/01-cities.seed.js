'use strict';

const { City } = require('../src/models');

const cities = [
  { id: 1, name: 'Jaipur', state: 'Rajasthan', country: 'India' },
  { id: 2, name: 'Jodhpur', state: 'Rajasthan', country: 'India' },
  { id: 3, name: 'Udaipur', state: 'Rajasthan', country: 'India' },
  { id: 4, name: 'Delhi', state: 'Delhi', country: 'India' },
  { id: 5, name: 'Mumbai', state: 'Maharashtra', country: 'India' },
];

async function seedCities() {
  console.log('→ Seeding cities...');
  await City.bulkCreate(cities, { ignoreDuplicates: true });
  console.log(`  ✔ ${cities.length} cities seeded`);
}

module.exports = seedCities;
