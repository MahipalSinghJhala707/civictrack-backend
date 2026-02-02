'use strict';

const { Issue } = require('../src/models');

const issues = [
  { id: 1, name: 'Pothole', slug: 'pothole', description: 'Road damage requiring repair' },
  { id: 2, name: 'Street Light', slug: 'street-light', description: 'Non-functional or damaged street lights' },
  { id: 3, name: 'Water Leakage', slug: 'water-leakage', description: 'Water pipeline leaks or burst pipes' },
  { id: 4, name: 'Garbage Dump', slug: 'garbage-dump', description: 'Illegal garbage dumping or overflowing bins' },
  { id: 5, name: 'Traffic Signal', slug: 'traffic-signal', description: 'Malfunctioning traffic signals' },
  { id: 6, name: 'Drainage', slug: 'drainage', description: 'Blocked or overflowing drains' },
  { id: 7, name: 'Road Damage', slug: 'road-damage', description: 'General road surface damage' },
  { id: 8, name: 'Public Property', slug: 'public-property', description: 'Damaged public property or facilities' },
  { id: 9, name: 'Encroachment', slug: 'encroachment', description: 'Illegal occupation of public space' },
  { id: 10, name: 'Other', slug: 'other', description: 'Other civic issues' },
];

async function seedIssues() {
  console.log('→ Seeding issue categories...');
  await Issue.bulkCreate(issues, { ignoreDuplicates: true });
  console.log(`  ✔ ${issues.length} issue categories seeded`);
}

module.exports = seedIssues;
