'use strict';

const { UserIssue } = require('../src/models');

// Sample reported issues
const userIssues = [
  {
    id: 1,
    title: 'Large pothole near MI Road junction',
    description: 'There is a large pothole approximately 2 feet wide near the MI Road and Station Road junction. Several vehicles have been damaged.',
    issue_id: 1,
    reporter_id: 5,
    authority_id: 1,
    latitude: 26.9124,
    longitude: 75.7873,
    region: 'Zone 1',
    status: 'reported',
    city_id: 1,
  },
  {
    id: 2,
    title: 'Street light not working for 2 weeks',
    description: 'The street light outside house number 45, Malviya Nagar has not been working for the past 2 weeks. The area is very dark at night.',
    issue_id: 2,
    reporter_id: 6,
    authority_id: 1,
    latitude: 26.8652,
    longitude: 75.8140,
    region: 'Zone 1',
    status: 'in_progress',
    city_id: 1,
  },
  {
    id: 3,
    title: 'Water pipeline leaking on main road',
    description: 'Major water leakage from underground pipeline on JLN Marg. Water has been flowing for 3 days causing water wastage and road damage.',
    issue_id: 3,
    reporter_id: 5,
    authority_id: 2,
    latitude: 26.9020,
    longitude: 75.7820,
    region: 'Zone 1',
    status: 'resolved',
    city_id: 1,
  },
  {
    id: 4,
    title: 'Garbage dump near school',
    description: 'Illegal garbage dumping near Government School, Vaishali Nagar. Causing health hazard for students and residents.',
    issue_id: 4,
    reporter_id: 7,
    authority_id: 4,
    latitude: 26.9150,
    longitude: 75.7280,
    region: 'Zone 2',
    status: 'reported',
    city_id: 1,
  },
  {
    id: 5,
    title: 'Road damage after monsoon',
    description: 'Severe road damage on the main market road. Multiple potholes and broken edges making it difficult for vehicles.',
    issue_id: 7,
    reporter_id: 7,
    authority_id: 5,
    latitude: 26.2389,
    longitude: 73.0243,
    region: 'Central',
    status: 'reported',
    city_id: 2,
  },
];

async function seedUserIssues() {
  console.log('→ Seeding user issues (reports)...');
  await UserIssue.bulkCreate(userIssues, { ignoreDuplicates: true });
  console.log(`  ✔ ${userIssues.length} user issues seeded`);
}

module.exports = seedUserIssues;
