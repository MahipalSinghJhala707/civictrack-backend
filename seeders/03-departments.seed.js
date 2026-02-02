'use strict';

const { Department } = require('../src/models');

const departments = [
  { id: 1, name: 'Public Works Department', description: 'Handles roads, bridges, and public infrastructure' },
  { id: 2, name: 'Water Supply Department', description: 'Manages water supply and sewage systems' },
  { id: 3, name: 'Electricity Department', description: 'Handles power supply and street lighting' },
  { id: 4, name: 'Sanitation Department', description: 'Manages garbage collection and cleanliness' },
  { id: 5, name: 'Traffic Department', description: 'Handles traffic management and signals' },
  { id: 6, name: 'Parks & Gardens', description: 'Maintains public parks and green spaces' },
  { id: 7, name: 'Health Department', description: 'Handles public health and hygiene' },
];

async function seedDepartments() {
  console.log('→ Seeding departments...');
  await Department.bulkCreate(departments, { ignoreDuplicates: true });
  console.log(`  ✔ ${departments.length} departments seeded`);
}

module.exports = seedDepartments;
