'use strict';

const { Authority } = require('../src/models');

const authorities = [
  // Jaipur authorities
  { id: 1, name: 'JMC Zone 1 - PWD', city: 'Jaipur', region: 'Zone 1', department_id: 1, city_id: 1, address: 'JMC Office, MI Road, Jaipur' },
  { id: 2, name: 'JMC Zone 1 - Water', city: 'Jaipur', region: 'Zone 1', department_id: 2, city_id: 1, address: 'PHED Office, Jaipur' },
  { id: 3, name: 'JMC Zone 2 - PWD', city: 'Jaipur', region: 'Zone 2', department_id: 1, city_id: 1, address: 'JMC Zone 2 Office, Jaipur' },
  { id: 4, name: 'JMC Sanitation', city: 'Jaipur', region: 'All Zones', department_id: 4, city_id: 1, address: 'Sanitation HQ, Jaipur' },
  
  // Jodhpur authorities
  { id: 5, name: 'JoMC PWD', city: 'Jodhpur', region: 'Central', department_id: 1, city_id: 2, address: 'Municipal Office, Jodhpur' },
  { id: 6, name: 'JoMC Water Supply', city: 'Jodhpur', region: 'All Areas', department_id: 2, city_id: 2, address: 'Water Works, Jodhpur' },
  
  // Udaipur authorities
  { id: 7, name: 'UMC Roads', city: 'Udaipur', region: 'City', department_id: 1, city_id: 3, address: 'UMC Office, Udaipur' },
];

async function seedAuthorities() {
  console.log('→ Seeding authorities...');
  await Authority.bulkCreate(authorities, { ignoreDuplicates: true });
  console.log(`  ✔ ${authorities.length} authorities seeded`);
}

module.exports = seedAuthorities;
