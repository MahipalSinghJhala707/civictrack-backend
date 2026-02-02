'use strict';

const { AuthorityIssue } = require('../src/models');

// Map authorities to the issue types they handle
const authorityIssues = [
  // JMC Zone 1 PWD handles potholes, road damage
  { id: 1, authority_id: 1, issue_id: 1 },  // Pothole
  { id: 2, authority_id: 1, issue_id: 7 },  // Road Damage
  { id: 3, authority_id: 1, issue_id: 8 },  // Public Property
  
  // JMC Zone 1 Water handles water issues
  { id: 4, authority_id: 2, issue_id: 3 },  // Water Leakage
  { id: 5, authority_id: 2, issue_id: 6 },  // Drainage
  
  // JMC Zone 2 PWD
  { id: 6, authority_id: 3, issue_id: 1 },  // Pothole
  { id: 7, authority_id: 3, issue_id: 7 },  // Road Damage
  
  // JMC Sanitation handles garbage
  { id: 8, authority_id: 4, issue_id: 4 },  // Garbage Dump
  
  // Jodhpur PWD
  { id: 9, authority_id: 5, issue_id: 1 },  // Pothole
  { id: 10, authority_id: 5, issue_id: 7 }, // Road Damage
  { id: 11, authority_id: 5, issue_id: 2 }, // Street Light
  
  // Jodhpur Water
  { id: 12, authority_id: 6, issue_id: 3 }, // Water Leakage
  { id: 13, authority_id: 6, issue_id: 6 }, // Drainage
  
  // Udaipur Roads
  { id: 14, authority_id: 7, issue_id: 1 }, // Pothole
  { id: 15, authority_id: 7, issue_id: 7 }, // Road Damage
];

async function seedAuthorityIssues() {
  console.log('→ Seeding authority-issue mappings...');
  await AuthorityIssue.bulkCreate(authorityIssues, { ignoreDuplicates: true });
  console.log(`  ✔ ${authorityIssues.length} authority-issue mappings seeded`);
}

module.exports = seedAuthorityIssues;
