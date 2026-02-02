'use strict';

const bcrypt = require('bcrypt');
const { User } = require('../src/models');

async function seedUsers() {
  console.log('→ Seeding users...');

  const passwordHash = await bcrypt.hash('Password123', 10);

  const users = [
    // Admin user
    { id: 1, name: 'Rajesh Kumar', email: 'admin@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    
    // Authority users
    { id: 2, name: 'Priya Sharma', email: 'priya.sharma@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    { id: 3, name: 'Amit Patel', email: 'amit.patel@civictrack.gov.in', password_hash: passwordHash, city_id: 1 },
    { id: 4, name: 'Sunita Verma', email: 'sunita.verma@civictrack.gov.in', password_hash: passwordHash, city_id: 2 },
    
    // Citizen users
    { id: 5, name: 'Sneha Mehta', email: 'sneha.mehta@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 6, name: 'Vikram Singh', email: 'vikram.singh@example.com', password_hash: passwordHash, city_id: 1 },
    { id: 7, name: 'Anjali Desai', email: 'anjali.desai@example.com', password_hash: passwordHash, city_id: 2 },
    { id: 8, name: 'Rahul Gupta', email: 'rahul.gupta@example.com', password_hash: passwordHash, city_id: 3 },
  ];

  await User.bulkCreate(users, { ignoreDuplicates: true });
  console.log(`  ✔ ${users.length} users seeded`);
  console.log('     Default password: Password123');
}

module.exports = seedUsers;
